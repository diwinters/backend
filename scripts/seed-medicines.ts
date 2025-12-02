import * as fs from 'fs';
import * as path from 'path';
import { pool } from '../src/config/database';

// Read the JSON files
const medicinesPath = path.join(__dirname, '../../src/lib/medicines.json');
const categorizedPath = path.join(__dirname, '../../src/lib/medicines-categorized.json');

const medicines = JSON.parse(fs.readFileSync(medicinesPath, 'utf-8'));
const categorizedData = JSON.parse(fs.readFileSync(categorizedPath, 'utf-8'));

// Map therapeutic class to our category slugs
const therapeuticToCategory: Record<string, string> = {
  'cardiovascular': 'heart',
  'endocrine_diabetes': 'diabetes',
  'central_nervous_system': 'other',
  'anti_infective': 'antibiotics',
  'gastrointestinal': 'digestive',
  'analgesics_antiinflammatory': 'pain_relief',
  'respiratory': 'cold_flu',
  'urology': 'other',
  'dermatology_other': 'skin_care',
  'ophthalmology': 'eye_care',
  'allergy': 'allergy',
  'vitamins': 'vitamins',
};

// Build a map of medicine ID -> category
const idToCategoryMap: Record<string, string> = {};

const therapeuticClasses = categorizedData.medical_intelligence?.categorized_medicines?.by_therapeutic_class;
if (therapeuticClasses) {
  for (const [className, ids] of Object.entries(therapeuticClasses)) {
    const category = therapeuticToCategory[className] || 'other';
    for (const id of ids as string[]) {
      idToCategoryMap[id] = category;
    }
  }
}

console.log(`Mapped ${Object.keys(idToCategoryMap).length} medicine IDs to categories`);

async function seedMedicines() {
  try {
    console.log('Starting medicine seeding...');
    
    let imported = 0;
    let skipped = 0;
    
    for (const med of medicines) {
      const category = idToCategoryMap[med.id] || 'other';
      
      try {
        await pool.query(
          `INSERT INTO medicines (name, price, quantity, category, requires_prescription, is_active, popularity)
           VALUES ($1, $2, $3, $4, $5, true, $6)
           ON CONFLICT DO NOTHING`,
          [
            med.name.trim(),
            parseFloat(med.price) || 0,
            med.quantity || '1',
            category,
            med.prescription_id ? true : false,
            parseInt(med.popularity) || 0
          ]
        );
        imported++;
      } catch (err) {
        console.error(`Failed to insert ${med.name}:`, err);
        skipped++;
      }
    }
    
    console.log(`✅ Imported ${imported} medicines, skipped ${skipped}`);
    
    // Show category distribution
    const result = await pool.query(
      `SELECT category, COUNT(*) as count FROM medicines GROUP BY category ORDER BY count DESC`
    );
    console.log('\nCategory distribution:');
    for (const row of result.rows) {
      console.log(`  ${row.category}: ${row.count}`);
    }
    
  } catch (error) {
    console.error('Seeding failed:', error);
  } finally {
    await pool.end();
  }
}

seedMedicines();
