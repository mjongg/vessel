// Tap-to-select options for the entry forms.
//
// CLINICAL REVIEW NEEDED (MJ): these are starter lists drawn from general clinical practice in the
// Philippine setting, written to make entry fast. They are not ranked by measured prevalence and cite no
// registry. Every list also accepts a typed "Other" entry, so nothing here limits what can be recorded.
// Selecting an option only fills in a name; it never sets a dose, a diagnosis status or a schedule.

export type Group={group:string;items:string[]};

export const allergyGroups:Group[]=[
 {group:'Drug',items:['Penicillin','Amoxicillin','Co-amoxiclav','Cephalosporins (e.g. cefalexin, cefuroxime)','Sulfa drugs (e.g. cotrimoxazole)','Aspirin','NSAIDs (e.g. ibuprofen, mefenamic acid, naproxen)','Paracetamol','Quinolones (e.g. ciprofloxacin, levofloxacin)','Macrolides (e.g. azithromycin, erythromycin)','Tetracyclines (e.g. doxycycline)','Anti-TB medicines','Allopurinol','Anti-seizure medicines (e.g. carbamazepine, phenytoin)','Local anesthetics (e.g. lidocaine)','Contrast dye','Opioids (e.g. tramadol, morphine)','Tetanus antitoxin (ATS)','Anti-rabies serum (ERIG)','A vaccine']},
 {group:'Food',items:['Shrimp / prawns','Crab','Shellfish (clams, mussels, oysters)','Squid','Fish','Dried or fermented seafood (tuyo, bagoong)','Chicken','Egg','Cow’s milk','Peanuts','Tree nuts','Soy','Wheat / gluten','Chocolate']},
 {group:'Environmental',items:['House dust mites','Dust','Pollen','Grass','Molds','Cockroach','Cat dander','Dog dander','Feathers','Insect stings (bee, wasp)','Ant bites','Latex','Nickel / jewelry','Adhesive tape / plaster','Soaps or detergents','Cosmetics or fragrance','Hair dye','Smoke or strong odors','Cold air or weather changes']},
];
export const allergyReactions=['Rash','Hives','Itching','Swelling of lips, face or eyes','Difficulty breathing or wheezing','Throat tightness','Anaphylaxis','Runny nose or sneezing','Nausea or vomiting','Diarrhea','Dizziness or fainting','Blistering or peeling skin'];
export const allergySeverities=['Mild','Moderate','Severe','Life-threatening','Unknown'];

export const conditionGroups:Group[]=[
 {group:'Heart & circulation',items:['Hypertension','Coronary artery disease','Previous heart attack','Heart failure','Atrial fibrillation / arrhythmia','Rheumatic heart disease','Stroke / TIA','Peripheral artery disease','Deep vein thrombosis / pulmonary embolism']},
 {group:'Diabetes, thyroid & metabolism',items:['Type 2 diabetes mellitus','Type 1 diabetes mellitus','Prediabetes','Gestational diabetes','Dyslipidemia / high cholesterol','Obesity','Thyroid disease','Hypothyroidism','Hyperthyroidism','Goiter / thyroid nodule','Gout / high uric acid']},
 {group:'Lungs & airways',items:['Asthma','COPD','Pulmonary tuberculosis','Pulmonary tuberculosis (treated)','Pulmonary tuberculosis (on treatment)','Pneumonia (past)','Obstructive sleep apnea','Allergic rhinitis']},
 {group:'Kidney & urinary',items:['Kidney disease','Chronic kidney disease','On dialysis','Kidney stones','Recurrent urinary tract infection','Benign prostatic hyperplasia']},
 {group:'Digestive & liver',items:['Liver disease','GERD','Peptic ulcer disease','Gallstones','Fatty liver','Hepatitis B','Hepatitis C','Liver cirrhosis','Irritable bowel syndrome','Hemorrhoids']},
 {group:'Brain & mental health',items:['Migraine','Epilepsy / seizure disorder','Dementia','Parkinson’s disease','Depression','Anxiety disorder','Bipolar disorder']},
 {group:'Blood & immune system',items:['Anemia','G6PD deficiency','Thalassemia','Bleeding disorder','HIV','Lupus (SLE)','Rheumatoid arthritis','Psoriasis']},
 {group:'Bones, joints, eyes & skin',items:['Osteoarthritis','Osteoporosis','Chronic low back pain','Glaucoma','Cataract','Eczema / atopic dermatitis']},
 {group:'Cancer',items:['Cancer','Breast cancer','Colorectal cancer','Lung cancer','Liver cancer','Cervical cancer','Prostate cancer','Thyroid cancer','Nasopharyngeal cancer','Leukemia / lymphoma']},
 {group:'Women’s health',items:['PCOS / PMOS (polycystic ovary syndrome)','Endometriosis','Uterine fibroids (myoma)','Preeclampsia (past)']},
 {group:'Past infections',items:['Dengue (past)','COVID-19 (past)','Chickenpox (past)','Measles (past)','Typhoid fever (past)']},
];
// The short screen asked first (the usual past medical and family history questions). Anything else comes from the full list.
export const conditionScreen=['Hypertension','Type 2 diabetes mellitus','Previous heart attack','Stroke / TIA','Asthma','Pulmonary tuberculosis','Thyroid disease','Kidney disease','Liver disease','Cancer'];
export const familyScreen=['Hypertension','Type 2 diabetes','Cancer','Stroke','Heart attack / coronary artery disease','Asthma','Hemophilia / bleeding disorder'];
export const medicineScreen=['Herbal or traditional supplements','Pain relievers (NSAIDs) taken regularly'];
export const smokingOptions=['Never smoked','Former smoker','Smokes now','Vapes'];
export const alcoholOptions=['Does not drink','Occasional','Regular'];
export const conditionStatuses=['Active','Controlled','Resolved / past','Unsure'];

export const surgeryGroups:Group[]=[
 {group:'Abdomen',items:['Appendectomy','Gallbladder removal (cholecystectomy)','Hernia repair','Colon or bowel surgery','Hemorrhoidectomy']},
 {group:'Heart & vessels',items:['Coronary angioplasty / stent','Coronary bypass (CABG)','Pacemaker implantation','Heart valve surgery','AV fistula creation']},
 {group:'Women’s health',items:['Cesarean section','Hysterectomy','Myomectomy','Dilation and curettage (D&C)','Tubal ligation','Breast surgery (lumpectomy or mastectomy)']},
 {group:'Bones & joints',items:['Fracture fixation','Knee replacement','Hip replacement','Spine surgery','Amputation']},
 {group:'Head, neck & eyes',items:['Tonsillectomy','Thyroidectomy','Cataract surgery']},
 {group:'Urinary & other',items:['Kidney stone procedure','Prostate surgery (TURP)','Circumcision','Removal of a cyst or mass']},
];
export const hospitalizationGroups:Group[]=[
 {group:'Heart & brain',items:['Heart attack / chest pain','Heart failure','Very high blood pressure','Stroke','Seizure']},
 {group:'Infection',items:['Pneumonia','Dengue','COVID-19','Tuberculosis','Urinary tract or kidney infection','Gastroenteritis / dehydration','Severe infection (sepsis)']},
 {group:'Other',items:['High or low blood sugar','Asthma or COPD attack','Gallbladder or appendix problem','Kidney problem / started dialysis','Bleeding','Accident, injury or fracture','Surgery or procedure','Cancer treatment','Childbirth','Observation']},
];

export const familyIllnessGroups:Group[]=[
 {group:'Heart & metabolism',items:['Hypertension','Type 2 diabetes','Type 1 diabetes','Heart attack / coronary artery disease','Heart disease before age 55 (men) or 65 (women)','Sudden cardiac death','Stroke','High cholesterol','Obesity','Gout','Thyroid disease']},
 {group:'Cancer',items:['Cancer','Breast cancer','Ovarian cancer','Colorectal cancer','Endometrial (uterine) cancer','Prostate cancer','Stomach cancer','Pancreatic cancer','Liver cancer','Lung cancer','Thyroid cancer','Nasopharyngeal cancer','Leukemia / lymphoma']},
 {group:'Kidney, lungs & allergy',items:['Kidney disease','Polycystic kidney disease','Asthma','Allergies / atopy','Tuberculosis (in the household)']},
 {group:'Blood & inherited',items:['Thalassemia','G6PD deficiency','Hemophilia / bleeding disorder','Anemia','Congenital heart disease or birth defect','Genetic disorder']},
 {group:'Brain & mental health',items:['Dementia / Alzheimer’s disease','Parkinson’s disease','Epilepsy','Depression','Bipolar disorder','Schizophrenia','Alcohol or substance use disorder']},
 {group:'Other',items:['Glaucoma','Osteoporosis','Autoimmune disease (e.g. lupus, rheumatoid arthritis)']},
];
export const relatives=['Father','Mother','Brother','Sister','Son','Daughter','Paternal grandfather','Paternal grandmother','Maternal grandfather','Maternal grandmother','Uncle','Aunt','Cousin'];

export const medicineGroups:Group[]=[
 {group:'Blood pressure & heart',items:['Amlodipine','Losartan','Telmisartan','Enalapril','Metoprolol','Carvedilol','Bisoprolol','Hydrochlorothiazide','Furosemide','Spironolactone']},
 {group:'Diabetes',items:['Metformin','Gliclazide','Glimepiride','Sitagliptin','Empagliflozin','Dapagliflozin','Insulin']},
 {group:'Cholesterol & blood thinners',items:['Atorvastatin','Rosuvastatin','Simvastatin','Aspirin','Clopidogrel','Warfarin','Apixaban','Rivaroxaban']},
 {group:'Thyroid, stomach & gout',items:['Levothyroxine','Methimazole','Omeprazole','Pantoprazole','Allopurinol','Febuxostat','Colchicine']},
 {group:'Lungs & allergy',items:['Salbutamol inhaler','Budesonide-formoterol inhaler','Fluticasone-salmeterol inhaler','Montelukast','Cetirizine','Loratadine']},
 {group:'Pain, prostate & supplements',items:['Paracetamol','Celecoxib','Tamsulosin','Finasteride','Calcium + vitamin D','Ferrous sulfate','Folic acid','Vitamin B complex','Multivitamins']},
 {group:'Women’s health',items:['Combined oral contraceptive pill','Progestin-only pill','Contraceptive injection (DMPA)','Contraceptive implant','Hormonal IUD','Emergency contraceptive pill','Prenatal vitamins','Folic acid','Ferrous sulfate','Calcium + vitamin D','Progesterone','Dydrogesterone','Isoxsuprine','Clomiphene','Letrozole','Cabergoline','Estradiol / hormone therapy','Tranexamic acid','Mefenamic acid','Metformin','Spironolactone','Tamoxifen','Anastrozole']},
 {group:'Brain, nerves & mental health',items:['Sertraline','Escitalopram','Fluoxetine','Quetiapine','Levetiracetam','Valproic acid','Carbamazepine','Phenytoin','Donepezil','Memantine','Levodopa-carbidopa','Gabapentin','Pregabalin']},
 {group:'Kidney & dialysis',items:['Erythropoietin','Sevelamer','Calcium carbonate','Sodium bicarbonate','Ketoanalogues']},
 {group:'Antibiotics',items:['Amoxicillin','Co-amoxiclav','Cefuroxime','Cefalexin','Azithromycin','Clarithromycin','Ciprofloxacin','Levofloxacin','Cotrimoxazole','Doxycycline','Metronidazole','Nitrofurantoin','Anti-TB medicines']},
];
export const antibioticNames=new Set(medicineGroups.find(g=>g.group==='Antibiotics')!.items);
export const doseUnits=['mg','mcg','g','mL','IU','units','tablet(s)','capsule(s)','puff(s)','drop(s)','sachet(s)','patch(es)'];
export const frequencies=['Once daily','Twice daily','Three times daily','Four times daily','Every other day','Once weekly','At bedtime','As needed'];

export const vaccineGroups:Group[]=[
 {group:'Adult & seasonal',items:['Influenza','COVID-19','Pneumococcal (PCV)','Pneumococcal (PPSV23)','Tetanus-diphtheria (Td / Tdap)','Tetanus toxoid','Hepatitis B','Hepatitis A','HPV','Herpes zoster (shingles)','Rabies','Typhoid','Japanese encephalitis','Meningococcal']},
 {group:'Childhood',items:['BCG','Pentavalent (DPT-HepB-Hib)','Oral polio (OPV)','Inactivated polio (IPV)','Rotavirus','MMR','Measles-rubella (MR)','Varicella']},
];
export const vaccineDoses=['Dose 1','Dose 2','Dose 3','Booster','Annual dose'];

export const relationshipsToYou=['You','Parent','Grandparent','Spouse / partner','Child','Sibling','Aunt / uncle','Other relative','Other person I care for'];
export const emergencyRelationships=['Spouse / partner','Parent','Child','Sibling','Grandchild','Other relative','Friend','Caregiver'];


// Short lists shown first, so nobody has to read a full list to find a common answer. The full list stays one tap away.
export const commonAllergies:Record<string,string[]>={
 Drug:['Penicillin','Amoxicillin','Co-amoxiclav','Cephalosporins (e.g. cefalexin, cefuroxime)','Sulfa drugs (e.g. cotrimoxazole)','Aspirin','NSAIDs (e.g. ibuprofen, mefenamic acid, naproxen)','Paracetamol','Contrast dye'],
 Food:['Shrimp / prawns','Crab','Shellfish (clams, mussels, oysters)','Fish','Egg','Cow’s milk','Peanuts','Chicken'],
 Environmental:['House dust mites','Dust','Pollen','Molds','Cat dander','Dog dander','Insect stings (bee, wasp)','Latex'],
};
export const commonHistory:Record<string,string[]>={
 Condition:['Dyslipidemia / high cholesterol','Gout / high uric acid','GERD','Anemia','Osteoarthritis','COPD','Allergic rhinitis','Migraine','Depression','Anxiety disorder','PCOS / PMOS (polycystic ovary syndrome)','Uterine fibroids (myoma)','Benign prostatic hyperplasia'],
 Surgery:['Appendectomy','Gallbladder removal (cholecystectomy)','Hernia repair','Cesarean section','Hysterectomy','Coronary angioplasty / stent','Cataract surgery','Fracture fixation','Thyroidectomy','Tonsillectomy'],
 Hospitalization:['Pneumonia','Dengue','COVID-19','Heart attack / chest pain','Stroke','High or low blood sugar','Asthma or COPD attack','Surgery or procedure','Childbirth','Accident, injury or fracture'],
 'Family history':['High cholesterol','Thyroid disease','Kidney disease','Breast cancer','Colorectal cancer','Lung cancer','Dementia / Alzheimer’s disease','Depression'],
};
export const commonVaccines=['Influenza','COVID-19','Pneumococcal (PCV)','Pneumococcal (PPSV23)','Tetanus-diphtheria (Td / Tdap)','Tetanus toxoid','Hepatitis B','HPV','Rabies'];
export const commonReactions=['Rash','Hives','Itching','Swelling of lips, face or eyes','Difficulty breathing or wheezing','Anaphylaxis'];
export const commonRelatives=['Father','Mother','Brother','Sister'];

const commonMedicines=['Amlodipine','Losartan','Metformin','Atorvastatin','Aspirin','Omeprazole','Paracetamol','Salbutamol inhaler','Multivitamins'];
const womenMedicines=['Combined oral contraceptive pill','Prenatal vitamins','Folic acid','Ferrous sulfate','Calcium + vitamin D'];
// Only reorders suggestions from conditions already entered. It never infers a condition from a medicine, or a medicine from a condition.
const medicinesByCondition:[RegExp,string[]][]=[
 [/hypertension/i,['Amlodipine','Losartan','Telmisartan','Metoprolol','Hydrochlorothiazide']],
 [/diabetes/i,['Metformin','Gliclazide','Sitagliptin','Empagliflozin','Insulin']],
 [/cholesterol|dyslipidemia/i,['Atorvastatin','Rosuvastatin','Simvastatin']],
 [/heart attack|coronary|stroke/i,['Aspirin','Clopidogrel','Atorvastatin','Metoprolol']],
 [/heart failure/i,['Furosemide','Spironolactone','Carvedilol','Bisoprolol']],
 [/atrial fibrillation/i,['Apixaban','Rivaroxaban','Warfarin','Metoprolol']],
 [/asthma|copd/i,['Salbutamol inhaler','Budesonide-formoterol inhaler','Fluticasone-salmeterol inhaler','Montelukast']],
 [/thyroid/i,['Levothyroxine','Methimazole']],
 [/gout/i,['Allopurinol','Febuxostat','Colchicine']],
 [/kidney|dialysis/i,['Erythropoietin','Sevelamer','Calcium carbonate','Sodium bicarbonate']],
 [/gerd|ulcer/i,['Omeprazole','Pantoprazole']],
 [/epilepsy|seizure/i,['Levetiracetam','Valproic acid','Carbamazepine']],
 [/depression|anxiety/i,['Sertraline','Escitalopram']],
 [/tuberculosis/i,['Anti-TB medicines']],
];
export function suggestedMedicines(conditions:string[],sex?:string){
 const matched=medicinesByCondition.filter(([re])=>conditions.some(c=>re.test(c))).flatMap(([,names])=>names);
 return [...new Set([...matched,...commonMedicines,...(sex==='Male'?[]:womenMedicines)])];
}

// Hide options that cannot apply to the recorded sex. An unrecorded sex keeps everything; "type it yourself" always remains.
const womenOnly=new Set(['Women’s health','PCOS / PMOS (polycystic ovary syndrome)','Endometriosis','Uterine fibroids (myoma)','Preeclampsia (past)','Gestational diabetes','Cesarean section','Hysterectomy','Myomectomy','Dilation and curettage (D&C)','Tubal ligation','Childbirth','Cervical cancer','Ovarian cancer','Endometrial (uterine) cancer']);
const menOnly=new Set(['Benign prostatic hyperplasia','Prostate cancer','Prostate surgery (TURP)','Tamsulosin','Finasteride']);
// Family history is about relatives, so it is never filtered by the patient's own sex.
export function forSex(groups:Group[],sex?:string):Group[]{
 const hidden=sex==='Male'?womenOnly:sex==='Female'?menOnly:null;
 if(!hidden)return groups;
 return groups.filter(g=>!hidden.has(g.group)).map(g=>({...g,items:g.items.filter(i=>!hidden.has(i))})).filter(g=>g.items.length);
}

export const doctorSpecialties=['Cardiology','Dermatology','Endocrinology','ENT','Family Medicine','Gastroenterology','General Surgery','Geriatrics','Hematology','Infectious Diseases','Internal Medicine','Nephrology','Neurology','OB-GYN','Oncology','Ophthalmology','Orthopedics','Pediatrics','Psychiatry','Pulmonology','Rehabilitation Medicine','Rheumatology','Urology'];
