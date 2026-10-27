// Pruebas propuestas, NO ejecutadas por el autor de esta entrega.
// Ejecutar en proceso aislado sin conexión PostgreSQL: node --test tests/collaboration.test.js
const { test } = require('node:test');
const assert = require('node:assert/strict');
delete process.env.DATABASE_URL;
delete process.env.POSTGRES_HOST;
const repository = require('../src/db/repository');
const collaboration = require('../src/services/collaboration');
const { randomUUID } = require('node:crypto');
const request = fields => ({ ...fields, requestId: randomUUID() });
const status = expected => error => error.statusCode === expected;

test('permisos, sincronización de ficha, versiones y reintentos en memoria', async () => {
  repository.reset();
  const coach = await repository.createUser({ name: 'Coach A', email: 'a@example.test', password: 'test-password' });
  const otherCoach = await repository.createUser({ name: 'Coach B', email: 'b@example.test', password: 'test-password' });
  const athlete = await repository.createAthlete({
    name: 'Alumno A', age: 16, trainerId: coach.id, consent: true,
    account: { email: 'student@example.test', password: 'test-password' }
  });
  const student = await repository.findUserById(athlete.userId);
  const other = await repository.createAthlete({ name: 'Alumno B', age: 15, trainerId: otherCoach.id });
  const create = request({ title: 'Skipping', details: '3 series de 20 metros' });

  const saved = await collaboration.mutate(coach, athlete.id, 'task.create', null, create);
  const retry = await collaboration.mutate(coach, athlete.id, 'task.create', null, create);
  assert.equal(saved.record.id, retry.record.id);
  assert.equal((await collaboration.snapshot(student)).tasks.length, 1);
  assert.equal((await collaboration.snapshot(coach, athlete.id)).events.length, 1);
  await assert.rejects(collaboration.mutate(coach, athlete.id, 'task.create', null, { ...create, title: 'Otro' }), status(409));
  await assert.rejects(collaboration.snapshot(otherCoach, athlete.id), status(403));
  await assert.rejects(collaboration.snapshot(student, other.id), status(403));
  await assert.rejects(collaboration.mutate(student, athlete.id, 'task.create', null, request({ title: 'No autorizado' })), status(403));

  const done = request({ done: true, version: 1 });
  const changed = await collaboration.mutate(student, undefined, 'task.update', saved.record.id, done);
  assert.equal(changed.record.version, 2);
  assert.equal((await collaboration.snapshot(coach, athlete.id)).tasks[0].done, true);
  const repeatDone = await collaboration.mutate(student, undefined, 'task.update', saved.record.id, done);
  assert.equal(repeatDone.record.version, 2);
  await assert.rejects(collaboration.mutate(student, undefined, 'task.update', saved.record.id, request({ done: false, version: 1 })), status(409));
  await assert.rejects(collaboration.mutate(coach, athlete.id, 'task.update', saved.record.id, request({ done: true, version: 2 })), status(403));
  await assert.rejects(collaboration.mutate(student, undefined, 'task.update', saved.record.id, request({ done: 'true', version: 2 })), status(400));
  await assert.rejects(collaboration.mutate(student, undefined, 'task.update', saved.record.id, request({ done: true, version: 0 })), status(400));

  const appointment = await collaboration.mutate(coach, athlete.id, 'appointment.create', null, request({
    title: 'Control', location: 'Pista', startsAt: '2026-11-01T16:00:00-03:00', endsAt: '2026-11-01T17:00:00-03:00'
  }));
  assert.equal(appointment.record.starts_at, '2026-11-01T19:00:00.000Z');
  await collaboration.mutate(student, undefined, 'appointment.update', appointment.record.id, request({ attendance: 'confirmed', version: 1 }));
  assert.equal((await collaboration.snapshot(coach, athlete.id)).appointments[0].attendance, 'confirmed');
  await collaboration.mutate(coach, athlete.id, 'appointment.update', appointment.record.id, request({ cancelled: true, version: 2 }));
  await assert.rejects(collaboration.mutate(student, undefined, 'appointment.update', appointment.record.id, request({ attendance: 'declined', version: 3 })), status(409));
  await assert.rejects(collaboration.mutate(coach, athlete.id, 'appointment.create', null, request({
    title: 'Mal horario', location: 'Pista', startsAt: '2026-11-01T17:00:00Z', endsAt: '2026-11-01T16:00:00Z'
  })), status(400));

  await collaboration.mutate(student, undefined, 'message.create', null, request({ body: 'Ejercicios realizados.' }));
  const snapshot = await collaboration.snapshot(coach, athlete.id);
  assert.equal(snapshot.messages[0].author_id, student.id);
  assert.equal(snapshot.storage, 'memory');
  assert.equal((await collaboration.snapshot(otherCoach, other.id)).messages.length, 0);
  await assert.rejects(collaboration.mutate(student, undefined, 'message.create', null, request({ body: ' ' })), status(400));
  await assert.rejects(repository.createSession({ athleteId: 999999, trainerId: coach.id }), status(404));
});
