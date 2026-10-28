import {test} from 'node:test';
import assert from 'node:assert/strict';
import {containRect,isVisible,poseAt} from '../src/services/poseGeometry.js';
test('video horizontal conserva bandas sin recortar cuerpo',()=>{assert.deepEqual(containRect(400,400,1920,1080),{x:0,y:87.5,width:400,height:225});});
test('video vertical conserva encuadre completo',()=>{assert.deepEqual(containRect(400,400,1080,1920),{x:87.5,y:0,width:225,height:400});assert.equal(containRect(0,400,0,0),null);});
test('descarta puntos fuera del cuadro y baja confianza',()=>{assert.ok(isVisible([.5,.4,.9,.9]));for(const p of [[1.1,.4,.9,.9],[.5,.4,.1,.9],[.5,.4,.9,.1],[NaN,.4,.9,.9]])assert.equal(isVisible(p),false);});
test('interpola solo muestras cercanas detectadas',()=>{const t={sample_interval:.1,frames:[{time:0,landmarks:[[0,0,.9,.8]]},{time:.1,landmarks:[[1,1,.8,.9]]}]};assert.deepEqual(poseAt(t,.05),[[.5,.5,.8,.8]]);assert.equal(poseAt(t,2),null);});
test('no inventa postura al perder deteccion',()=>{assert.equal(poseAt({sample_interval:.1,frames:[{time:0,landmarks:[[0,0,1,1]]},{time:.1,landmarks:null}]},.1),null);});
