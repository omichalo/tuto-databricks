/**
 * Parcours de bout en bout côté serveur, contre les émulateurs Auth et Firestore :
 * jeton anonyme → cookie de session → Route Handlers → documents Firestore.
 */
import { beforeAll, describe, expect, it } from 'vitest';
import { DELETE as sessionDelete, POST as sessionPost } from '@/app/api/session/route';
import { POST as lessonPost } from '@/app/api/progress/lessons/route';
import { GET as progressGet } from '@/app/api/progress/route';
import { POST as quizPost } from '@/app/api/quiz/check/route';
import { POST as exercisePost } from '@/app/api/exercises/[exerciseId]/check/route';
import { POST as labReportPost } from '@/app/api/labs/[labId]/progress/route';
import { POST as solutionPost } from '@/app/api/labs/[labId]/solution/route';
import { POST as ackPost } from '@/app/api/acknowledgements/route';
import { EXERCISE_KEYS, LAB_KEYS } from '@/generated/server/keys';
import { db } from '@/server/firebase-admin';

const ORIGIN = 'http://localhost:3000';
const AUTH_HOST = process.env.FIREBASE_AUTH_EMULATOR_HOST ?? '127.0.0.1:9099';
const TRACK = 'databricks-sql-delta';
const LESSON = 'requetes-agregations';
const LAB = 'delta-first-table';

function noParams(): { params: Promise<Record<string, string>> } {
  return { params: Promise.resolve({}) };
}

function params(p: Record<string, string>): { params: Promise<Record<string, string>> } {
  return { params: Promise.resolve(p) };
}

async function anonymousIdToken(): Promise<{ idToken: string; uid: string }> {
  const res = await fetch(
    `http://${AUTH_HOST}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=demo-api-key`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ returnSecureToken: true }),
    },
  );
  const body = (await res.json()) as { idToken: string; localId: string };
  return { idToken: body.idToken, uid: body.localId };
}

function request(
  path: string,
  body: unknown,
  cookie: string | null,
  origin: string | null = ORIGIN,
): Request {
  const headers = new Headers({ 'content-type': 'application/json' });
  if (origin !== null) headers.set('origin', origin);
  if (cookie !== null) headers.set('cookie', cookie);
  return new Request(`${ORIGIN}${path}`, { method: 'POST', headers, body: JSON.stringify(body) });
}

let cookie = '';
let uid = '';

beforeAll(async () => {
  const token = await anonymousIdToken();
  uid = token.uid;
  const res = await sessionPost(
    request('/api/session', { idToken: token.idToken }, null),
    noParams(),
  );
  expect(res.status).toBe(200);
  const setCookie = res.headers.get('set-cookie') ?? '';
  expect(setCookie).toMatch(/^__session=.+; Path=\/; HttpOnly; SameSite=Lax/);
  cookie = setCookie.split(';')[0] ?? '';
});

describe('chaîne d’autorisation', () => {
  it('refuse une écriture sans session', async () => {
    const res = await lessonPost(
      request(
        '/api/progress/lessons',
        { trackId: TRACK, lessonId: LESSON, action: 'complete' },
        null,
      ),
      noParams(),
    );
    expect(res.status).toBe(401);
  });

  it('refuse une origine étrangère (CSRF)', async () => {
    const res = await lessonPost(
      request(
        '/api/progress/lessons',
        { trackId: TRACK, lessonId: LESSON, action: 'complete' },
        cookie,
        'https://evil.example',
      ),
      noParams(),
    );
    expect(res.status).toBe(403);
  });

  it('refuse une requête sans en-tête Origin', async () => {
    const res = await lessonPost(
      request(
        '/api/progress/lessons',
        { trackId: TRACK, lessonId: LESSON, action: 'seen' },
        cookie,
        null,
      ),
      noParams(),
    );
    expect(res.status).toBe(403);
  });

  it('refuse les champs inattendus (schéma strict)', async () => {
    const res = await lessonPost(
      request(
        '/api/progress/lessons',
        {
          trackId: TRACK,
          lessonId: LESSON,
          action: 'complete',
          verificationKind: 'remote-verified',
        },
        cookie,
      ),
      noParams(),
    );
    expect(res.status).toBe(400);
  });

  it('refuse un cookie de session forgé', async () => {
    const res = await lessonPost(
      request(
        '/api/progress/lessons',
        { trackId: TRACK, lessonId: LESSON, action: 'seen' },
        '__session=forged',
      ),
      noParams(),
    );
    expect(res.status).toBe(401);
  });

  it('refuse un jeton d’identification invalide', async () => {
    const res = await sessionPost(
      request('/api/session', { idToken: 'not-a-valid-token-xyz' }, null),
      noParams(),
    );
    expect(res.status).toBe(401);
  });
});

describe('progression', () => {
  it('complète une leçon une seule fois et met à jour la synthèse', async () => {
    const first = await lessonPost(
      request(
        '/api/progress/lessons',
        { trackId: TRACK, lessonId: LESSON, action: 'complete' },
        cookie,
      ),
      noParams(),
    );
    expect(await first.json()).toEqual({ written: true });
    const second = await lessonPost(
      request(
        '/api/progress/lessons',
        { trackId: TRACK, lessonId: LESSON, action: 'complete' },
        cookie,
      ),
      noParams(),
    );
    expect(await second.json()).toEqual({ written: false });

    const res = await progressGet(
      new Request(`${ORIGIN}/api/progress?trackId=${TRACK}`, { headers: { cookie } }),
      noParams(),
    );
    const view = (await res.json()) as {
      track: { completedCount: number };
      lessons: { lessonId: string; status: string }[];
    };
    expect(view.track.completedCount).toBe(1);
    expect(view.lessons.find((l) => l.lessonId === LESSON)?.status).toBe('completed');
  });

  it('refuse une leçon inconnue', async () => {
    const res = await lessonPost(
      request(
        '/api/progress/lessons',
        { trackId: TRACK, lessonId: 'inconnue', action: 'complete' },
        cookie,
      ),
      noParams(),
    );
    expect(res.status).toBe(404);
  });

  it('corrige un quiz côté serveur et garde le meilleur score', async () => {
    const res = await quizPost(
      request('/api/quiz/check', { lessonId: LESSON, answers: {} }, cookie),
      noParams(),
    );
    const grade = (await res.json()) as { score: number; maxScore: number; saved: boolean };
    expect(grade).toMatchObject({ score: 0, saved: true });
    expect(grade.maxScore).toBeGreaterThanOrEqual(3);
  });

  it('valide un exercice sur empreinte, sans divulguer l’empreinte attendue', async () => {
    const wrong = await exercisePost(
      request('/api/exercises/revenus-par-pays/check', { resultHash: 'a'.repeat(64) }, cookie),
      params({ exerciseId: 'revenus-par-pays' }),
    );
    const wrongBody = await wrong.text();
    expect(JSON.parse(wrongBody)).toMatchObject({ passed: false, saved: true });
    const expected = EXERCISE_KEYS['revenus-par-pays']?.expectedHash ?? '';
    expect(wrongBody).not.toContain(expected);

    const right = await exercisePost(
      request('/api/exercises/revenus-par-pays/check', { resultHash: expected }, cookie),
      params({ exerciseId: 'revenus-par-pays' }),
    );
    expect(await right.json()).toMatchObject({ passed: true, attempts: 2 });
    const stored = (await db().doc(`users/${uid}/exerciseResults/revenus-par-pays`).get()).data();
    expect(stored).toMatchObject({ passed: true, verificationKind: 'automatic-formative' });
  });
});

describe('TP Free Edition auto-déclaré', () => {
  const report = {
    provider: 'databricks-free-manual',
    completed: true,
    checkCode: 'dft-43854',
    cleanupConfirmed: true,
  };

  it('exige l’acceptation des conditions Free Edition avant une déclaration', async () => {
    const res = await labReportPost(
      request(`/api/labs/${LAB}/progress`, report, cookie),
      params({ labId: LAB }),
    );
    expect(res.status).toBe(403);
  });

  it('refuse une version obsolète des conditions', async () => {
    const res = await ackPost(
      request(
        '/api/acknowledgements',
        { kind: 'free-edition-terms', version: 'free-edition-v0' },
        cookie,
      ),
      noParams(),
    );
    expect(res.status).toBe(409);
  });

  it('enregistre la déclaration comme auto-déclarée, même avec un code correct', async () => {
    const ack = await ackPost(
      request(
        '/api/acknowledgements',
        { kind: 'free-edition-terms', version: 'free-edition-v1' },
        cookie,
      ),
      noParams(),
    );
    expect(ack.status).toBe(200);
    const res = await labReportPost(
      request(`/api/labs/${LAB}/progress`, report, cookie),
      params({ labId: LAB }),
    );
    const body = (await res.json()) as { written: boolean; progress: Record<string, unknown> };
    expect(body.written).toBe(true);
    expect(body.progress).toMatchObject({
      verificationKind: 'self-reported',
      status: 'reported-completed',
      checkCodeMatched: true,
      cleanupConfirmed: true,
      provider: 'databricks-free-manual',
    });
    const stored = (await db().doc(`users/${uid}/labProgress/${LAB}`).get()).data();
    expect(stored?.verificationKind).toBe('self-reported');
  });

  it('n’accepte pas un fournisseur non déclarable', async () => {
    for (const provider of ['browser', 'databricks-connected']) {
      const res = await labReportPost(
        request(`/api/labs/${LAB}/progress`, { ...report, provider }, cookie),
        params({ labId: LAB }),
      );
      expect(res.status).toBe(400);
    }
  });

  it('signale un code incohérent sans jamais le révéler', async () => {
    const res = await labReportPost(
      request(`/api/labs/${LAB}/progress`, { ...report, checkCode: 'DFT-00000' }, cookie),
      params({ labId: LAB }),
    );
    const text = await res.text();
    expect(JSON.parse(text)).toMatchObject({ progress: { checkCodeMatched: false } });
    expect(text).not.toContain(LAB_KEYS[LAB]?.checkCode ?? 'DFT-43854');
  });

  it('sert le corrigé à une session et enregistre sa consultation', async () => {
    const res = await solutionPost(
      request(`/api/labs/${LAB}/solution`, { provider: 'databricks-free-manual' }, cookie),
      params({ labId: LAB }),
    );
    expect(res.status).toBe(200);
    expect(res.headers.get('cache-control')).toBe('private, no-store');
    expect(await res.text()).toContain('nbformat');
    const stored = (await db().doc(`users/${uid}/labProgress/${LAB}`).get()).data();
    expect(stored?.solutionViewedAt).toBeDefined();
  });

  it('refuse le corrigé sans session', async () => {
    const res = await solutionPost(
      request(`/api/labs/${LAB}/solution`, { provider: 'databricks-free-manual' }, null),
      params({ labId: LAB }),
    );
    expect(res.status).toBe(401);
  });
});

describe('limites de taille et sessions', () => {
  it('refuse un corps déclaré trop volumineux sans le lire', async () => {
    const big = JSON.stringify({
      trackId: TRACK,
      lessonId: LESSON,
      action: 'seen',
      pad: 'x'.repeat(20_000),
    });
    const headers = new Headers({
      'content-type': 'application/json',
      origin: ORIGIN,
      cookie,
      'content-length': String(big.length),
    });
    const res = await lessonPost(
      new Request(`${ORIGIN}/api/progress/lessons`, { method: 'POST', headers, body: big }),
      noParams(),
    );
    expect(res.status).toBe(400);
  });

  it('refuse un corps trop volumineux transmis en flux sans longueur', async () => {
    const chunk = new TextEncoder().encode('x'.repeat(8 * 1024));
    let sent = 0;
    const stream = new ReadableStream<Uint8Array>({
      pull(controller) {
        if (sent >= 4) controller.close();
        else {
          sent += 1;
          controller.enqueue(chunk);
        }
      },
    });
    const res = await lessonPost(
      new Request(`${ORIGIN}/api/progress/lessons`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', origin: ORIGIN, cookie },
        body: stream,
        duplex: 'half',
      } as RequestInit & { duplex: 'half' }),
      noParams(),
    );
    expect(res.status).toBe(400);
  });

  it('limite la création de sessions par client réseau', async () => {
    const ip = `2001:db8::${Math.floor(Math.random() * 0xffffff).toString(16)}`;
    const statuses: number[] = [];
    for (let i = 0; i < 22; i += 1) {
      const req = request('/api/session', { idToken: 'not-a-valid-token-xyz' }, null);
      req.headers.set('x-forwarded-for', `${ip}, 10.0.0.1`);
      statuses.push((await sessionPost(req, noParams())).status);
    }
    expect(statuses.slice(0, 20).every((s) => s === 401)).toBe(true);
    expect(statuses.slice(20)).toEqual([429, 429]);
  });

  it('révoque aussi une session anonyme à la déconnexion', async () => {
    const token = await anonymousIdToken();
    const created = await sessionPost(
      request('/api/session', { idToken: token.idToken }, null),
      noParams(),
    );
    const anonCookie = (created.headers.get('set-cookie') ?? '').split(';')[0] ?? '';
    await new Promise((resolve) => setTimeout(resolve, 1100));
    const del = await sessionDelete(
      new Request(`${ORIGIN}/api/session`, {
        method: 'DELETE',
        headers: { origin: ORIGIN, cookie: anonCookie },
      }),
      noParams(),
    );
    expect(del.status).toBe(200);
    const reuse = await lessonPost(
      request(
        '/api/progress/lessons',
        { trackId: TRACK, lessonId: LESSON, action: 'seen' },
        anonCookie,
      ),
      noParams(),
    );
    expect(reuse.status).toBe(401);
  });
});

describe('quotas', () => {
  it('limite le nombre de déclarations de TP par minute', async () => {
    const statuses: number[] = [];
    for (let i = 0; i < 12; i += 1) {
      const res = await labReportPost(
        request(
          `/api/labs/${LAB}/progress`,
          {
            provider: 'professional-workspace',
            completed: i % 2 === 0,
            checkCode: null,
            cleanupConfirmed: false,
          },
          cookie,
        ),
        params({ labId: LAB }),
      );
      statuses.push(res.status);
    }
    expect(statuses).toContain(429);
  });
});
