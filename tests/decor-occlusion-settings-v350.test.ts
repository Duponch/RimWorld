import {describe,it,expect} from 'vitest';
import {decorOcclusionEnabled,DEFAULT_DECOR_OCCLUSION_ENABLED} from '../src/render/decor-occlusion-settings';
describe('common decor visibility preference',()=>{
 it('defaults to occlusion without interpreting absent legacy values as zero',()=>{expect(DEFAULT_DECOR_OCCLUSION_ENABLED).toBe(true);for(const values of [[null,null],[undefined,undefined],['',null],[0,null]])expect(decorOcclusionEnabled(null,values[0],values[1])).toBe(true);});
 it('retains explicit prior disable of both circles only',()=>{expect(decorOcclusionEnabled(null,'0','0')).toBe(false);expect(decorOcclusionEnabled(undefined,0,0)).toBe(false);expect(decorOcclusionEnabled(null,0,18)).toBe(true);});
 it('new preference takes priority over old radii',()=>{expect(decorOcclusionEnabled('true',0,0)).toBe(true);expect(decorOcclusionEnabled('false',18,30)).toBe(false);expect(decorOcclusionEnabled(true,0,0)).toBe(true);expect(decorOcclusionEnabled(false)).toBe(false);});
 it('malformed preference has a stable enabled fallback',()=>{for(const value of ['garbage','0','1',{},[],1,0])expect(decorOcclusionEnabled(value,0,0)).toBe(true);});
});
