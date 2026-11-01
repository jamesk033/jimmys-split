-- Jimmy's Split: loads ICT_Jimmy's own split, weights, checklists and key notes into the site owner's account
-- (the first account, same admin as Jimmy's Journal). Does nothing if it's already loaded.
-- Run after 0001_lift.sql.

do $$
declare
  owner uuid := (select user_id from public.app_admins order by created_at asc limit 1);
  ex uuid[] := array[]::uuid[];
  dy uuid[] := array[]::uuid[];
  r record;
  new_id uuid;
begin
  if owner is null then raise notice 'No admin account yet.'; return; end if;
  if exists (select 1 from public.lift_days where user_id = owner and name = 'A Upper 1') then raise notice 'Owner split already loaded.'; return; end if;

  -- Starting fresh: clear any starter rows made on a first visit.
  delete from public.lift_days where user_id = owner;
  delete from public.lift_exercises where user_id = owner;
  delete from public.lift_checklist_items where user_id = owner;
  delete from public.lift_notes where user_id = owner;
  insert into public.lift_settings (user_id, units) values (owner, 'lb')
    on conflict (user_id) do update set units = coalesce(public.lift_settings.units, 'lb');

  for r in select * from (values
    (0,'Back','Wide-grip lat pulldown','strap','4-8',260,'don''t lean back','weighted pullup - strap'),
    (1,'Back','Pronated t-bar row--> kelso shrug','strap','4-8',200,'wide grip to flare elbows',''),
    (2,'Upper Chest','Seated mach. incline chest press','belt','4-8',335,'close & neutral grip, tuck elbows, seat adjusted so grips in line w/ upper chest','supinated incline smith machine chest press'),
    (3,'Back','Uni. seated low row mach.-->kelso shrug','strap','4-8',200,'seat high, tuck elbow',''),
    (4,'Front Delt','Seated db shoulder press','belt','4-8',90,'',''),
    (5,'Lat. Head Tricep','Weighted dip','dip belt','4-8',105,'',''),
    (6,'Bicep','Straight bar cab. curl','','4-8',98,'elbow pinned to side',''),
    (7,'Long Head Tricep','Uni. cab. tri ext','cuff','4-8',58,'elbow pinned to side, set cable head height, body upright',''),
    (8,'Side Delt','Uni. cab. lateral raise','cuff','4-8',28,'cable starts at hand height, motion behind body, slight internal rotation','straight arm lateral raise mach.'),
    (9,'Brach','Straight bar cab. rev. curl','strap','4-8',83,'',''),
    (10,'SCM','Lying plate neck curl','','4-8',35,'plate on forehead, use pad/knit cap',''),
    (11,'Quad','Hack squat','belt, flat shoes','4-6',390,'',''),
    (12,'Erector','RDL','strap, belt','4-6',415,'feet shoulder width, hands just outside shoulder width, pull slack, wedge hips',''),
    (13,'Hamstring','Mach. leg curl','','4-8',170,'',''),
    (14,'Quad','Uni. leg ext','','4-8',205,'bilateral once I get gym pin',''),
    (15,'Rear Delt','Bilateral rev. pec deck fly','','4-8',200,'',''),
    (16,'Calf','Standing calf raise','flat shoes','4-8',540,'hold stretch 1 sec, down 3 sec',''),
    (17,'core','Dragon flags','','4-8',null,'Bw, ankle weights',''),
    (18,'Back of Neck','Cab. neck ext','harness','4-8',null,'',''),
    (19,'Forearm Flexors','Db wrist curl','','6-10',75,'forearm on flat bench',''),
    (20,'Adductor','Seated hip adduction','','4-8',205,'Pick feet up to reduce leg drive',''),
    (21,'Forearm Extensors','Db wrist ext.','','6-10',30,'forearm on flat bench','')
  ) as t(pos, muscle, name, equipment, reps, weight, note, alt) order by pos loop
    insert into public.lift_exercises (user_id, muscle, name, equipment, sets, reps, weight_lb, note, alternative, position)
    values (owner, r.muscle, r.name, r.equipment, 1, r.reps, r.weight, r.note, r.alt, r.pos) returning id into new_id;
    ex := ex || new_id;
  end loop;

  for r in select * from (values
    (0,'A Upper 1'),
    (1,'A Lower 1'),
    (2,'A Upper 2'),
    (3,'A Lower 2'),
    (4,'B Upper 1'),
    (5,'B Lower 1'),
    (6,'B Upper 2'),
    (7,'B Lower 2')
  ) as t(pos, name) order by pos loop
    insert into public.lift_days (user_id, name, position) values (owner, r.name, r.pos) returning id into new_id;
    dy := dy || new_id;
  end loop;

  insert into public.lift_day_exercises (user_id, day_id, exercise_id, position)
  select owner, dy[d + 1], ex[e + 1], p from (values
    (0,0,0),
    (0,2,1),
    (0,3,2),
    (0,7,3),
    (0,8,4),
    (0,6,5),
    (0,4,6),
    (0,9,7),
    (0,10,8),
    (1,11,0),
    (1,15,1),
    (1,13,2),
    (1,16,3),
    (1,19,4),
    (1,18,5),
    (1,21,6),
    (2,1,0),
    (2,2,1),
    (2,3,2),
    (2,7,3),
    (2,8,4),
    (2,6,5),
    (2,5,6),
    (2,9,7),
    (2,10,8),
    (3,14,0),
    (3,15,1),
    (3,16,2),
    (3,17,3),
    (3,18,4),
    (3,19,5),
    (3,20,6),
    (3,21,7),
    (4,0,0),
    (4,2,1),
    (4,3,2),
    (4,7,3),
    (4,8,4),
    (4,6,5),
    (4,4,6),
    (4,9,7),
    (4,10,8),
    (5,12,0),
    (5,15,1),
    (5,14,2),
    (5,16,3),
    (5,19,4),
    (5,18,5),
    (5,21,6),
    (6,1,0),
    (6,2,1),
    (6,3,2),
    (6,7,3),
    (6,8,4),
    (6,6,5),
    (6,5,6),
    (6,9,7),
    (6,10,8),
    (7,13,0),
    (7,15,1),
    (7,16,2),
    (7,17,3),
    (7,18,4),
    (7,19,5),
    (7,20,6),
    (7,21,7)
  ) as t(d, e, p);

  insert into public.lift_checklist_items (user_id, kind, body, position)
  select owner, k, b, p from (values
    ('pre','1.5 hrs before workout, slow digesting carbs and protein',0),
    ('pre','30 mins before lifting, fast digesting carbs',1),
    ('pre','Fruit',2),
    ('pre','Half teaspoon baking soda under tongue',3),
    ('pre','4 granules Baja Gold Celtic salt',4),
    ('pre','Painkillers, bathroom',5),
    ('pre','Music & mobility work',6),
    ('pre','Perform 3 consecutive warmup sets before working set',7),
    ('post','Foam roller',0),
    ('post','Static stretch entire body',1),
    ('post','Lax ball rollout',2),
    ('post','Dead hangs',3),
    ('refuel','Dextrose (Gator/Powerade) (prefer alt. w/out additives)',0),
    ('refuel','15 grams creatine monohydrate',1),
    ('refuel','100 grams flavorless pure plain whey protein',2),
    ('refuel','Fast carbs w/ protein, glucose or dextrose & honey (sugar raises insulin, boosts IGF-1)',3),
    ('refuel','Vitamins / supplements',4)
  ) as t(k, b, p);

  insert into public.lift_notes (user_id, title, body, position)
  select owner, t, b, p from (values
    ('How the split works','Upper / Lower x Infinity (rest day when necessary)
1 set per exercise (followed by partials)
High intensity, every working set to failure, high frequency, low volume
Slow + controlled reps, emphasis on form & eccentric
4-8 rep range: hit 9 reps = increase slightly next workout (progressive overload)
4-6 reps for squat and RDL: hit 7 reps = increase slightly next workout
6-10 reps for forearms: hit 11 reps = increase slightly next workout
3-4 reps per 2 warmup sets, then rest 2 mins before working set
The most stable exercises allow for better form
Progress comes from recovery (sleep, nutrition, mental clarity & consistency)',0),
    ('Necessary equipment','Belt
Straps (w/ cuff): Ekkovision or Gymreapers
Dip belt
Flat sole shoes (squat, deadlift & calf raise)
Water bottle
Headphones
Gym pin
Neck harness',1)
  ) as x(t, b, p);
end $$;
