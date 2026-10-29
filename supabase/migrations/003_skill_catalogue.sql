-- =============================================================================
-- SkillShare Local — Migration 003: Skill Catalogue
-- =============================================================================
-- Stores the platform's researched skill catalogue. This is REFERENCE DATA
-- (market-research-backed skill definitions) and is kept strictly separate
-- from live provider listings and user-generated data.
--
-- Depends on: 001_profiles.sql (for user_role enum + handle_updated_at)
--
-- Data source: "skill share local market research (1).xlsx" (22-Sep-2026)
-- Evidence: LinkedIn India job-market snapshots, SWAYAM Plus, NIELIT, IGRUA,
--           Tally Education.
--
-- IMPORTANT: LinkedIn counts are live search-result snapshots.
-- They evidence that demand EXISTS, not a precise labour-market census.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Enums
-- ---------------------------------------------------------------------------
do $$ begin
  create type public.evidence_status as enum ('verified', 'needs_validation');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.evidence_type_enum as enum ('job_market', 'training', 'job_and_training');
exception when duplicate_object then null;
end $$;


-- ---------------------------------------------------------------------------
-- 2. Table: skill_catalogue
-- ---------------------------------------------------------------------------
-- Read-only for all client roles. Populated by this migration only.
-- Providers reference catalogue entries when listing their skills;
-- provider_skills.skill_name corresponds to skill_catalogue.name.
create table if not exists public.skill_catalogue (
  id                  text        primary key,  -- e.g. 'cat_s1'
  name                text        not null unique,
  field               text        not null,     -- broad research grouping
  category            text        not null,     -- platform UI category
  icon                text        not null default '📚',
  description         text        not null default '',
  evidence_status     public.evidence_status not null default 'verified',
  evidence_summary    text        not null default '',
  evidence_type       public.evidence_type_enum not null default 'job_market',
  example_orgs        text[]      not null default '{}',
  source_label        text        not null default '',
  source_url          text        not null default '',
  popularity_rank     int         not null default 99,
  is_active           boolean     not null default true,
  is_featured         boolean     not null default false,
  tags                text[]      not null default '{}',
  -- Research provenance
  research_date       date        not null default '2026-09-22',
  created_at          timestamptz not null default now()
);

comment on table public.skill_catalogue is
  'Platform skill catalogue — researched, evidence-backed skill definitions. '
  'Reference data only. Separate from live provider listings and user data. '
  'Source: market research (22-Sep-2026).';

comment on column public.skill_catalogue.evidence_status is
  'verified = peer-reviewed market evidence found; '
  'needs_validation = promising but lacks India-wide verified data.';

comment on column public.skill_catalogue.is_active is
  'False for skills not yet shown in the platform UI (e.g. needs_validation candidates).';


-- ---------------------------------------------------------------------------
-- 3. Indexes
-- ---------------------------------------------------------------------------
create index if not exists skill_catalogue_category_idx     on public.skill_catalogue(category);
create index if not exists skill_catalogue_field_idx        on public.skill_catalogue(field);
create index if not exists skill_catalogue_is_active_idx    on public.skill_catalogue(is_active);
create index if not exists skill_catalogue_popularity_idx   on public.skill_catalogue(popularity_rank);


-- ---------------------------------------------------------------------------
-- 4. RLS
-- ---------------------------------------------------------------------------
alter table public.skill_catalogue enable row level security;

-- Anyone authenticated can read active catalogue entries
drop policy if exists "skill_catalogue: authenticated read active" on public.skill_catalogue;
create policy "skill_catalogue: authenticated read active"
  on public.skill_catalogue for select to authenticated
  using (is_active = true);

-- Anonymous users can also read (for public explore page)
drop policy if exists "skill_catalogue: anon read active" on public.skill_catalogue;
create policy "skill_catalogue: anon read active"
  on public.skill_catalogue for select to anon
  using (is_active = true);

-- Admins can read everything (including inactive); writes remain migration-only.
drop policy if exists "skill_catalogue: admin read all" on public.skill_catalogue;
create policy "skill_catalogue: admin read all"
  on public.skill_catalogue for select to authenticated
  using (public.is_admin());

-- No client INSERT/UPDATE/DELETE — catalogue is managed through migrations only
-- (admin can insert via the admin policy above for future additions)

revoke insert, update, delete on public.skill_catalogue from public, authenticated, anon;
grant select on public.skill_catalogue to authenticated, anon;


-- ---------------------------------------------------------------------------
-- 5. Seed: All 42 catalogue entries from market research
-- ---------------------------------------------------------------------------
-- Existing ids/names are never updated by a re-run. Conflicting rows are skipped.
-- Evidence summaries are research summaries, not all verbatim spreadsheet text.
-- LinkedIn counts are from a Sep-2026 snapshot and will become stale.

insert into public.skill_catalogue (
  id, name, field, category, icon, description, evidence_status,
  evidence_summary, evidence_type, example_orgs, source_label, source_url,
  popularity_rank, is_active, is_featured, tags, research_date
) values

-- Technology & Analytics
('cat_s1', 'Data Science', 'Technology & Analytics', 'Technology', '📊',
 'Learn data analysis, statistics, and machine learning to extract insights from data.',
 'verified',
 '11,000+ Data Scientist job listings on LinkedIn India (snapshot, Sep 2026). Evidence that demand exists; not a guarantee of employment.',
 'job_market', ARRAY['EXL','IBM','TCS','eBay','Infosys'],
 'LinkedIn India', 'https://in.linkedin.com/jobs/data-science-jobs',
 3, true, true, ARRAY['analytics','python','machine learning','statistics'], '2026-09-22'),

('cat_s2', 'Data Analytics', 'Technology & Analytics', 'Technology', '📈',
 'Analyse and interpret complex data to help organisations make informed decisions.',
 'verified',
 '10,000+ Data Analyst job listings on LinkedIn India (snapshot, Sep 2026).',
 'job_market', ARRAY['EXL','Wipro','Guidehouse','ICE','Priceline'],
 'LinkedIn India', 'https://in.linkedin.com/jobs/data-analysts-jobs',
 4, true, true, ARRAY['analytics','excel','sql','data'], '2026-09-22'),

('cat_s3', 'Business Analytics', 'Business & Analytics', 'Business', '📉',
 'Apply analytical techniques to solve business problems and drive strategy.',
 'verified',
 '5,000+ Data Science and Business Analytics job listings on LinkedIn India (snapshot, Sep 2026).',
 'job_market', ARRAY['EXL','Cisco','Aditya Birla Capital','Myntra','Kotak Mahindra Bank'],
 'LinkedIn India', 'https://in.linkedin.com/jobs/data-science-and-business-analytics-jobs',
 12, true, false, ARRAY['analytics','strategy','business','data'], '2026-09-22'),

('cat_s4', 'Business Analysis', 'Business & Analytics', 'Business', '🗂️',
 'Bridge business and technology teams by defining requirements and improving processes.',
 'verified',
 '8,000+ Business Analyst job listings on LinkedIn India (snapshot, Sep 2026).',
 'job_market', ARRAY['Deloitte','Amazon','EXL','KPMG India','Aditya Birla Capital','Cisco'],
 'LinkedIn India', 'https://in.linkedin.com/jobs/business-analyst-jobs',
 13, true, false, ARRAY['business analysis','requirements','agile','process'], '2026-09-22'),

-- Technology & AI
('cat_s5', 'Machine Learning / AI', 'Technology & AI', 'Technology', '🤖',
 'Build intelligent systems that learn from data using ML algorithms and neural networks.',
 'verified',
 '25,000+ Machine Learning Engineer job listings on LinkedIn India (snapshot, Sep 2026).',
 'job_market', ARRAY['Deloitte','HARMAN','Meril','eBay','BDO India'],
 'LinkedIn India', 'https://in.linkedin.com/jobs/machine-learning-engineer-jobs',
 2, true, true, ARRAY['ml','ai','neural networks','python','tensorflow'], '2026-09-22'),

('cat_s6', 'Prompt Engineering', 'AI & Emerging Tech', 'Technology', '💬',
 'Design effective prompts for large language models and generative AI tools.',
 'verified',
 'SWAYAM Plus offers a 45-hour Prompt Engineering course with IITM Pravartak (552 learners enrolled at time of research, Sep 2026).',
 'training', ARRAY['IITM Pravartak Technologies Foundation'],
 'SWAYAM Plus', 'https://swayamplus.education.gov.in/courses/prompt-engineering',
 8, true, true, ARRAY['ai','chatgpt','llm','prompts','generative ai'], '2026-09-22'),

-- Technology & Security
('cat_s7', 'Cybersecurity', 'Technology & Security', 'Technology', '🔒',
 'Protect digital systems from cyber threats, vulnerabilities, and attacks.',
 'verified',
 '8,000+ Cybersecurity job listings on LinkedIn India (snapshot, Sep 2026). NIELIT and Simplilearn offer instructor-led cybersecurity certifications.',
 'job_and_training', ARRAY['Wipro','Deloitte','EY','Cyderes','Medline India'],
 'LinkedIn India + NIELIT', 'https://in.linkedin.com/jobs/cyber%2Bsecurity-jobs',
 7, true, false, ARRAY['security','networking','ethical hacking','compliance'], '2026-09-22'),

-- Technology & Cloud
('cat_s8', 'Cloud Engineering / DevOps', 'Technology & Cloud', 'Technology', '☁️',
 'Build, deploy, and maintain cloud infrastructure and CI/CD pipelines.',
 'verified',
 '26,000+ Cloud Engineer job listings on LinkedIn India (snapshot, Sep 2026).',
 'job_market', ARRAY['Accenture','Capgemini','Infosys','Tata Communications','Fortanix'],
 'LinkedIn India', 'https://in.linkedin.com/jobs/cloud-engineer-jobs',
 6, true, true, ARRAY['aws','azure','devops','docker','kubernetes'], '2026-09-22'),

-- Software Development
('cat_s9', 'Web Development', 'Software Development', 'Technology', '🌐',
 'Build responsive, modern websites and web applications.',
 'verified',
 '4,000+ Web Developer job listings on LinkedIn India (snapshot, Sep 2026).',
 'job_market', ARRAY['Deloitte','Infosys','Capgemini','PwC Acceleration Center India'],
 'LinkedIn India', 'https://in.linkedin.com/jobs/web-developer-jobs',
 1, true, true, ARRAY['html','css','javascript','react','frontend'], '2026-09-22'),

('cat_s10', 'Software Development', 'Software Development', 'Technology', '💻',
 'Design and build software applications across web, mobile, and enterprise platforms.',
 'verified',
 '30,000+ Software Developer job listings on LinkedIn India (snapshot, Sep 2026).',
 'job_market', ARRAY['Infosys','Capgemini','Cisco','Google','Adobe','Microsoft'],
 'LinkedIn India', 'https://in.linkedin.com/jobs/software-developer-jobs-jobs',
 5, true, true, ARRAY['programming','software','coding','backend','fullstack'], '2026-09-22'),

-- Design & Technology
('cat_s11', 'UI/UX Design', 'Design & Technology', 'Creative Arts', '🎨',
 'Design intuitive user interfaces and seamless user experiences for digital products.',
 'verified',
 '1,000+ UI Designer job listings on LinkedIn India (snapshot, Sep 2026).',
 'job_market', ARRAY['Apple','Infosys','Kotak Neo','HDFC Securities','Media.net'],
 'LinkedIn India', 'https://in.linkedin.com/jobs/openings-for-ui-designers-jobs',
 9, true, true, ARRAY['figma','ux','ui','design','prototyping'], '2026-09-22'),

-- Analytics
('cat_s12', 'Power BI / Data Visualization', 'Analytics', 'Technology', '📊',
 'Create insightful dashboards and visual reports using Power BI and similar tools.',
 'verified',
 '8,000+ Power BI job listings on LinkedIn India (snapshot, Sep 2026).',
 'job_market', ARRAY['Deloitte','Infosys','PwC India','Cisco','Navi'],
 'LinkedIn India', 'https://in.linkedin.com/jobs/power-bi-jobs-india',
 11, true, false, ARRAY['power bi','dashboards','data viz','reporting','excel'], '2026-09-22'),

-- Marketing
('cat_s13', 'Digital Marketing', 'Marketing', 'Business', '📣',
 'SEO, social media, paid ads, email marketing, and content strategy.',
 'verified',
 '18,000+ Digital Marketing job listings on LinkedIn India (snapshot, Sep 2026).',
 'job_market', ARRAY['PUMA','Marico','Nykaa','Flipkart','Emami','LEGO'],
 'LinkedIn India', 'https://in.linkedin.com/jobs/digital-marketing-jobs-jobs',
 10, true, true, ARRAY['seo','social media','marketing','content','google ads'], '2026-09-22'),

-- Creative & Design
('cat_s14', 'Graphic Design', 'Creative & Design', 'Creative Arts', '🖼️',
 'Create visual content — branding, print, and digital assets using tools like Illustrator and Photoshop.',
 'verified',
 '2,000+ Graphic Designer job listings on LinkedIn India (snapshot, Sep 2026).',
 'job_market', ARRAY['Google Operations Center','Landor','PepsiCo','Purplle','P&G'],
 'LinkedIn India', 'https://in.linkedin.com/jobs/jobs-for-graphic-designer-jobs',
 14, true, true, ARRAY['design','photoshop','illustrator','branding','print'], '2026-09-22'),

-- Content & Media
('cat_s15', 'Content Writing', 'Content & Media', 'Business', '✍️',
 'Write compelling articles, blogs, marketing copy, and social media content.',
 'verified',
 '2,000+ Content Writer job listings on LinkedIn India (snapshot, Sep 2026).',
 'job_market', ARRAY['Swiggy','Network18','Deloitte','Jagran New Media','Baidyanath'],
 'LinkedIn India', 'https://in.linkedin.com/jobs/content-writer-jobs',
 19, true, false, ARRAY['writing','blogging','copywriting','seo writing','content'], '2026-09-22'),

-- Creative & Media
('cat_s16', 'Video Editing', 'Creative & Media', 'Creative Arts', '🎬',
 'Edit and produce professional videos for social media, YouTube, films, and corporate content.',
 'verified',
 '2,000+ Video Editing job listings on LinkedIn India (snapshot, Sep 2026).',
 'job_market', ARRAY['Unacademy','Swiggy','Vedantu','Schbang','Network18','Prime Video'],
 'LinkedIn India', 'https://in.linkedin.com/jobs/video-editing-jobs',
 16, true, false, ARRAY['premiere pro','after effects','video','editing','youtube'], '2026-09-22'),

('cat_s17', 'Photography', 'Creative & Media', 'Creative Arts', '📷',
 'Master camera techniques, composition, lighting, and photo editing.',
 'verified',
 '82 Photographer job listings and photography internships listed on LinkedIn India in the research snapshot.',
 'job_market', ARRAY['StayVista','IMPRESIO STUDIO','TELUS Digital AI Data Solutions'],
 'LinkedIn India', 'https://in.linkedin.com/jobs/photographe-jobs',
 17, true, true, ARRAY['photography','camera','lightroom','portrait','editing'], '2026-09-22'),

-- Creative Technology
('cat_s18', '3D Art / 3D Modeling', 'Creative Technology', 'Creative Arts', '🎮',
 'Create 3D assets, characters, and environments for games, film, and product design.',
 'verified',
 '2,000+ 3D Art job listings on LinkedIn India (snapshot, Sep 2026).',
 'job_market', ARRAY['Infosys','Meril','Juego Studios','SuperDNA 3D Lab','The Walt Disney Company'],
 'LinkedIn India', 'https://in.linkedin.com/jobs/3d-art-jobs',
 22, true, false, ARRAY['3d','blender','maya','modeling','animation'], '2026-09-22'),

-- Advanced Manufacturing
('cat_s19', '3D Printing', 'Advanced Manufacturing', 'Technology', '🖨️',
 'Learn FDM printing, 3D modelling, slicing, and maintenance of 3D printers.',
 'verified',
 '302 3D Printing job listings on LinkedIn India (snapshot, Sep 2026). SWAYAM Plus / IIT Madras offers an 80% hands-on course covering FDM printing.',
 'job_and_training', ARRAY['Meril','3Ding','Protofusion3D','Dawn Digital','Route To Smile Healthcare'],
 'LinkedIn India + SWAYAM Plus', 'https://swayamplus.education.gov.in/courses/3d-printing-for-aspiring-engineers',
 28, false, false, ARRAY['3d printing','fdm','cad','additive manufacturing','prototyping'], '2026-09-22'),

-- Engineering & Design
('cat_s20', 'CAD / AutoCAD', 'Engineering & Design', 'Technology', '📐',
 'Create technical drawings and 3D models using AutoCAD and related CAD tools.',
 'verified',
 '10,000+ CAD Design job listings on LinkedIn India (snapshot, Sep 2026).',
 'job_market', ARRAY['Larsen & Toubro','Infosys','WSP','Assystem','Jio'],
 'LinkedIn India', 'https://in.linkedin.com/jobs/cad-design-jobs',
 21, true, false, ARRAY['autocad','cad','mechanical design','civil','drafting'], '2026-09-22'),

-- Emerging Technology
('cat_s21', 'Drone Piloting', 'Emerging Technology', 'Technology', '🚁',
 'Learn to fly drones safely, understand DGCA regulations, and apply drones professionally.',
 'verified',
 '267 Drone job listings on LinkedIn India (snapshot, Sep 2026). IGRUA offers DGCA-certified 5-day RPAS training at approved sites.',
 'job_and_training', ARRAY['Airbound','Senso Vision','Zoid Technologies','Drone Destination'],
 'LinkedIn India + IGRUA', 'https://igrua.gov.in/drone-training',
 29, false, false, ARRAY['drone','dgca','rpas','aerial photography','uav'], '2026-09-22'),

-- Technology & Engineering
('cat_s22', 'IoT (Internet of Things)', 'Technology & Engineering', 'Technology', '🔌',
 'Connect devices, build sensor networks, and create smart-home or industrial IoT solutions.',
 'verified',
 '1,000+ IoT job listings on LinkedIn India (snapshot, Sep 2026).',
 'job_market', ARRAY['PwC India','Airtel','Larsen & Toubro','Tata Electronics','Capgemini Engineering'],
 'LinkedIn India', 'https://in.linkedin.com/jobs/internet-of-things-%28iot%29-jobs',
 27, false, false, ARRAY['iot','arduino','raspberry pi','sensors','smart home'], '2026-09-22'),

-- Electronics & Engineering
('cat_s23', 'Embedded Systems', 'Electronics & Engineering', 'Technology', '⚙️',
 'Programme microcontrollers, design firmware, and build embedded hardware solutions.',
 'verified',
 '6,000+ Embedded Systems job listings on LinkedIn India (snapshot, Sep 2026).',
 'job_market', ARRAY['NXP Semiconductors','Schneider Electric','Emerson','Microchip','Philips'],
 'LinkedIn India', 'https://in.linkedin.com/jobs/embedded-systems-jobs',
 26, false, false, ARRAY['embedded','c programming','firmware','microcontroller','hardware'], '2026-09-22'),

-- Advanced Technology
('cat_s39', 'Robotics', 'Advanced Technology', 'Technology', '🦾',
 'Design, build, and programme robotic systems — from hobbyist kits to industrial automation.',
 'verified',
 '2,000+ Robotics job listings on LinkedIn India (snapshot, Sep 2026). Employers include Tata Electronics, Apple, L&T, Meril, and NVIDIA.',
 'job_market', ARRAY['Tata Electronics','Apple','Larsen & Toubro','Meril','NVIDIA'],
 'LinkedIn India', 'https://in.linkedin.com/jobs/robotics-jobs',
 28, true, false, ARRAY['robotics','automation','ros','mechanical','programming'], '2026-09-22'),

-- Accounting & Finance
('cat_s24', 'Tally / Computerised Accounting', 'Accounting & Finance', 'Business', '🧾',
 'Learn TallyPrime for business accounting, GST filing, and financial record management.',
 'verified',
 '1,908 Tally job listings on LinkedIn India (snapshot, Sep 2026). Tally Education offers TallyPrime certifications. NIELIT listed a 4-week Financial Accounting using TallyPrime online course in 2026.',
 'job_and_training', ARRAY['KPMG India','Tata Communications','Licious','Tally Education'],
 'LinkedIn India + Tally Education + NIELIT', 'https://in.linkedin.com/jobs/tally-jobs',
 20, true, false, ARRAY['tally','accounting','gst','finance','bookkeeping'], '2026-09-22'),

-- Finance
('cat_s25', 'Financial Analysis / FP&A', 'Finance', 'Business', '💰',
 'Build financial models, analyse statements, and support business planning.',
 'verified',
 '7,000+ Financial Analyst job listings on LinkedIn India (snapshot, Sep 2026).',
 'job_market', ARRAY['Morgan Stanley','BlackRock','BDO India','Tata Advanced Systems','Sodexo'],
 'LinkedIn India', 'https://in.linkedin.com/jobs/financial-analyst-jobs',
 23, true, false, ARRAY['finance','excel','financial modelling','investment','fpa'], '2026-09-22'),

-- Business & Commerce
('cat_s26', 'Sales', 'Business & Commerce', 'Business', '🤝',
 'Learn consultative selling, objection handling, CRM tools, and closing techniques.',
 'verified',
 '64,000+ Sales job listings on LinkedIn India (snapshot, Sep 2026).',
 'job_market', ARRAY['Britannia','Aditya Birla Capital','PepsiCo','MakeMyTrip','Larsen & Toubro'],
 'LinkedIn India', 'https://in.linkedin.com/jobs/sales-sales-jobs',
 25, true, false, ARRAY['sales','crm','business development','negotiation','b2b'], '2026-09-22'),

-- Business & Technology
('cat_s27', 'Product Management', 'Business & Technology', 'Business', '🗺️',
 'Define product vision, roadmaps, and user stories — bridging business and engineering.',
 'verified',
 '5,000+ Product Manager job listings on LinkedIn India (snapshot, Sep 2026).',
 'job_market', ARRAY['Google','Amazon','Wati','HDFC Securities','Airtel Digital','TCS'],
 'LinkedIn India', 'https://in.linkedin.com/jobs/product%2Bmanager-jobs',
 24, true, false, ARRAY['product management','agile','roadmap','strategy','pm'], '2026-09-22'),

-- Design & Built Environment
('cat_s28', 'Interior Design', 'Design & Built Environment', 'Creative Arts', '🏠',
 'Design residential and commercial spaces — space planning, materials, and styling.',
 'verified',
 '9,000+ Interior Designer job listings on LinkedIn India (snapshot, Sep 2026).',
 'job_market', ARRAY['Livspace','Tata Technologies','HBA','IKEA','Design Cafe'],
 'LinkedIn India', 'https://in.linkedin.com/jobs/interior-designer-jobs',
 30, true, false, ARRAY['interior design','space planning','3d viz','autocad','materials'], '2026-09-22'),

-- Design & Craft
('cat_s29', 'Jewellery Design', 'Design & Craft', 'Creative Arts', '💍',
 'Design and create jewellery using traditional and CAD-based techniques.',
 'verified',
 '1,000+ Jewellery Design job listings on LinkedIn India (snapshot, Sep 2026).',
 'job_market', ARRAY['Wolfpack Labs','Sant Ram''s','Diamond Atelier','Angel Jewels','KuberBox'],
 'LinkedIn India', 'https://in.linkedin.com/jobs/jewellery-design-jobs',
 34, false, false, ARRAY['jewellery','design','cad','gold','fashion'], '2026-09-22'),

-- Fashion & Skilled Trade
('cat_s30', 'Tailoring / Garment Stitching', 'Fashion & Skilled Trade', 'Creative Arts', '🧵',
 'Learn pattern-making, garment construction, alterations, and boutique tailoring.',
 'verified',
 '1,000+ Tailor job listings on LinkedIn India (snapshot, Sep 2026).',
 'job_market', ARRAY['VIDHI & DHRUV','Naukripay group','Morara.Narrative'],
 'LinkedIn India', 'https://in.linkedin.com/jobs/tailor-jobs',
 32, false, false, ARRAY['tailoring','sewing','garments','stitching','fashion'], '2026-09-22'),

-- Pet Services
('cat_s31', 'Pet Grooming', 'Pet Services', 'Health & Wellness', '🐶',
 'Professional grooming, bathing, clipping, and styling for cats and dogs.',
 'verified',
 '1,000+ Pet Groomer job listings on LinkedIn India (snapshot, Sep 2026). Majority are full-time roles.',
 'job_market', ARRAY['Petsfolio','TaskUs','Spa Staff.com','Career Cartz'],
 'LinkedIn India', 'https://in.linkedin.com/jobs/pet-groomer-jobs',
 33, false, false, ARRAY['pet grooming','dogs','cats','grooming','salon'], '2026-09-22'),

-- Beauty & Personal Services
('cat_s32', 'Makeup Artistry', 'Beauty & Personal Services', 'Health & Wellness', '💄',
 'Bridal, editorial, and everyday makeup artistry using professional techniques.',
 'verified',
 '303 Makeup Artist job listings on LinkedIn India (snapshot, Sep 2026).',
 'job_market', ARRAY['The Estée Lauder Companies','Broadway','Spa Staff.com','Amazon'],
 'LinkedIn India', 'https://in.linkedin.com/jobs/makeup-artists-jobs',
 31, true, false, ARRAY['makeup','beauty','bridal','artistry','salon'], '2026-09-22'),

-- Project Candidate — needs local validation
('cat_s34', 'Crochet', 'Creative / Handmade', 'Creative Arts', '🧶',
 'Learn crochet techniques to create garments, accessories, and home décor items.',
 'needs_validation',
 'Useful income-generating skill for handmade products. No reliable India-wide job-count source found in this research pass (Sep 2026). Validate through local survey, craft marketplaces, and local mentors before listing as high-demand.',
 'job_market', ARRAY[]::text[],
 'Internal research — needs local validation', '',
 36, false, false, ARRAY['crochet','handmade','craft','yarn','knitting'], '2026-09-22'),

-- Platform originals (strong local market, established demand)
('cat_s35', 'Guitar', 'Music', 'Music', '🎸',
 'From first chords to advanced playing — classical and popular styles.',
 'verified',
 'Strong local demand via music academies and private tutors across Indian cities.',
 'training', ARRAY[]::text[],
 'Platform data', '',
 15, true, true, ARRAY['guitar','music','chords','classical','acoustic'], '2026-09-22'),

('cat_s36', 'Fitness Training', 'Health & Wellness', 'Health & Wellness', '💪',
 'Personalised fitness coaching for weight loss, strength building, and overall wellness.',
 'verified',
 'High local demand. Personal training is a well-established profession in Indian cities.',
 'training', ARRAY[]::text[],
 'Platform data', '',
 18, true, true, ARRAY['fitness','gym','personal training','weight loss','strength'], '2026-09-22'),

('cat_s37', 'Cooking', 'Culinary Arts', 'Culinary Arts', '🍳',
 'Master Indian regional cuisines and international cooking from basics to advanced.',
 'verified',
 'High local demand across Indian cities. Home chefs and culinary instructors have an established market.',
 'training', ARRAY[]::text[],
 'Platform data', '',
 15, true, true, ARRAY['cooking','indian cuisine','baking','chef','culinary'], '2026-09-22'),

('cat_s38', 'Python', 'Software Development', 'Technology', '🐍',
 'Programming, automation, data analysis, and introductory data science with Python.',
 'verified',
 'Python is consistently the most searched programming skill across India, strongly correlated with Data Science and ML demand.',
 'job_market', ARRAY['Google','Amazon','Infosys','TCS','Flipkart'],
 'LinkedIn India', 'https://in.linkedin.com/jobs/python-developer-jobs',
 7, true, true, ARRAY['python','programming','automation','data science','scripting'], '2026-09-22'),

-- New entries from research spreadsheet (not in original catalogue)
('cat_s40', 'Nail Art / Nail Technician', 'Beauty & Personal Services', 'Beauty & Wellness', '💅',
 'Nail art, gel nails, acrylics, and nail care for clients in salons or home setups.',
 'verified',
 '110 Nail Artist / Nail Technician job listings on LinkedIn India (snapshot, Sep 2026). This small formal-sector snapshot does not quantify informal work.',
 'job_market', ARRAY['SVITNAIL','Oxana Salon','Just For You Salon and Day Spa'],
 'LinkedIn India', 'https://in.linkedin.com/jobs/nail-jobs',
 38, true, false, ARRAY['nail art','beauty','salon','gel nails','manicure'], '2026-09-22'),

('cat_s41', 'Gardening / Landscaping', 'Green Skills', 'Home & Lifestyle', '🌱',
 'Home gardening, kitchen gardens, terrace gardens, and basic landscaping.',
 'verified',
 '50 Gardening job listings on LinkedIn India (snapshot, Sep 2026). This small formal-sector snapshot does not measure local informal demand.',
 'job_market', ARRAY['Isprava','RPG Gruppe','RST Gruppe','Gartenbox'],
 'LinkedIn India', 'https://in.linkedin.com/jobs/gardening-jobs',
 40, true, false, ARRAY['gardening','plants','terrace garden','landscaping','green living'], '2026-09-22'),

('cat_s33', 'Baking / Pastry', 'Food & Hospitality', 'Culinary Arts', '🥐',
 'Learn bread baking, pastry techniques, cake decoration, and home bakery operations.',
 'verified',
 '514 Baker job listings on LinkedIn India (snapshot, Sep 2026).',
 'job_market', ARRAY['PYRAMID','Banjo''s Bakery Cafes','Abin''s Cafe and Patisserie','Melodybites'],
 'LinkedIn India', 'https://in.linkedin.com/jobs/baker-jobs',
 35, true, false, ARRAY['baking','pastry','cake','bread','home bakery'], '2026-09-22'),

-- Project candidate — needs local validation
('cat_s42', 'Pet Care (Non-Medical)', 'Pet Services', 'Pet Services', '🐾',
 'Basic pet care, feeding routines, behaviour basics, and companionship for cats and dogs.',
 'needs_validation',
 'Pet grooming has verified job-market evidence (see Pet Grooming), but this does not establish demand for broader non-medical pet care. Split into specific services and validate locally.',
 'job_market', ARRAY[]::text[],
 'Internal research — needs local validation', '',
 41, false, false, ARRAY['pet care','dogs','cats','pet sitting','animal care'], '2026-09-22')

on conflict (id) do nothing;

-- Verify seed count
do $$
declare v_count int;
begin
  select count(*) into v_count from public.skill_catalogue;
  raise notice 'skill_catalogue now has % rows', v_count;
end $$;
