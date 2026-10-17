import 'server-only';
import type { DocumentReference } from 'firebase-admin/firestore';
import { lessonProgressId } from '@/domain/progress/model';
import { db } from '../firebase-admin';

export const paths = {
  user: (uid: string): DocumentReference => db().collection('users').doc(uid),
  lessonProgress: (uid: string, trackId: string, lessonId: string): DocumentReference =>
    db()
      .collection('users')
      .doc(uid)
      .collection('lessonProgress')
      .doc(lessonProgressId(trackId, lessonId)),
  trackProgress: (uid: string, trackId: string): DocumentReference =>
    db().collection('users').doc(uid).collection('trackProgress').doc(trackId),
  exerciseResult: (uid: string, exerciseId: string): DocumentReference =>
    db().collection('users').doc(uid).collection('exerciseResults').doc(exerciseId),
  labProgress: (uid: string, labId: string): DocumentReference =>
    db().collection('users').doc(uid).collection('labProgress').doc(labId),
};
