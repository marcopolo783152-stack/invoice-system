import test from 'node:test';
import assert from 'node:assert/strict';
import {appointmentEmailFeedback} from '../../lib/appointment-email-feedback.mjs';
test('only provider acceptance can indicate a sent message',()=>{
 assert.equal(appointmentEmailFeedback('accepted').sent,true);
 for(const state of ['paused','failed','uncertain','not_configured','unavailable','not_queued','pending'])assert.equal(appointmentEmailFeedback(state).sent,false);
});
test('a failed notification preserves booking success and discourages duplicate reservations',()=>{
 for(const state of ['paused','failed','uncertain','not_configured','unavailable']){const result=appointmentEmailFeedback(state);assert.match(result.message,/request is saved/);assert.match(result.message,/do not book again/);assert.match(result.message,/spam or junk/);}
});
