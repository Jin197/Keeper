// Deterministic mini DVSA extract (comma CSVs) for testing the pipeline end-to-end.
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

export function writeFixture(dir) {
  mkdirSync(dir, { recursive: true });
  // Lookups: two item groups (root "Brakes" → child "Brake pads"; root "Tyres")
  writeFileSync(join(dir, 'item_group.csv'), [
    'test_item_id,parent_id,test_class_id,item_name,minor_item',
    '1,,4,Brakes,N', '2,1,4,Brake pads and discs,N', '3,,4,Tyres,N', '4,,4,Lamps reflectors and electrical equipment,N',
  ].join('\n'));
  writeFileSync(join(dir, 'item_detail.csv'), [
    'rfr_id,test_class_id,test_item_id,minor_item,rfr_desc,rfr_loc_marker,rfr_insp_manual_desc,rfr_advisory_text,test_item_set_section_id',
    '100,4,2,N,Brake pad(s) less than 1.5 mm thick,Y,,Brake pads wearing thin,1',
    '200,4,3,N,Tyre tread depth below requirements,Y,,Tyre worn close to legal limit,3',
    '300,4,4,N,Headlamp not working,Y,,,4',
  ].join('\n'));

  // Tests: FORD FOCUS 2012 first use, 80 tests; VW GOLF 40 tests. Deterministic pattern.
  const results = ['test_id,vehicle_id,test_date,test_class_id,test_type,test_result,test_mileage,postcode_area,make,model,colour,fuel_type,cylinder_capacity,first_use_date'];
  const items = ['test_id,rfr_id,rfr_type_code,location_id,dangerous_mark,test_class_id'];
  let id = 1;
  const add = (make, model, count, failEvery, firstUse, miles) => {
    for (let i = 0; i < count; i++, id++) {
      const fails = i % failEvery === 0;
      results.push(`${id},${id},2023-06-${String((i % 28) + 1).padStart(2, '0')},4,NT,${fails ? 'F' : 'P'},${miles + i * 100},SW,${make},${model},BLUE,PE,1600,${firstUse}`);
      if (fails) items.push(`${id},100,F,1,N,4`); // brake pad failure
      if (i % 5 === 0) items.push(`${id},200,A,1,N,4`); // tyre advisory
      if (i % 10 === 0) items.push(`${id},300,F,2,N,4`); // lamp fail (counts as F too)
    }
  };
  add('FORD', 'FOCUS ZETEC', 80, 4, '2012-03-01', 68_000); // ~110k km, age 11
  add('VOLKSWAGEN', 'GOLF SE TDI', 40, 8, '2015-01-15', 40_000); // ~64k km, age 8
  add('FORD', 'FOCUS', 10, 2, '2012-03-01', 68_000); // second variant string, same family
  // Noise: a retest and a class-7 van, both must be skipped.
  results.push(`${id++},9,2023-06-01,4,RT,P,70000,SW,FORD,FOCUS,RED,PE,1600,2012-03-01`);
  results.push(`${id++},9,2023-06-01,7,NT,F,70000,SW,FORD,TRANSIT,RED,DI,2200,2012-03-01`);
  writeFileSync(join(dir, 'test_result.csv'), results.join('\n'));
  writeFileSync(join(dir, 'test_item.csv'), items.join('\n'));
}

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].split('/').pop())) {
  writeFixture(process.argv[2] ?? './data/dvsa-fixture');
}
