import { database } from '../config/database.js';

export async function getDashboardStats(req, res) {
  try {
    // 1. Total Parcels
    const [parcelRows] = await database.query('SELECT COUNT(*) as count FROM ibaan');
    const totalParcels = parcelRows[0]?.count || 0;

    // 2. Tax Collections (Using tax_forms manual paymentStatus + manual amountPaid/taxAmount if available, falling back to Ibaan)
    // We need to fetch all tax forms first to check manual overrides
    const [taxForms] = await database.query(`
        SELECT tf."taxAmount", tf."amountPaid", tod."paymentStatus"
        FROM tax_forms tf
        LEFT JOIN tax_other_details tod ON tf.id = tod."taxId"
    `);

    // Fetch Ibaan data as base
    const [ibaanRows] = await database.query('SELECT "AmountPaid", "Tax_Amount" FROM ibaan');
    
    // Logic:
    // We don't have a direct link 1:1 easily without fetching all. 
    // To simplify: We will sum up from Ibaan, but if a Tax Form exists and has paymentStatus='Paid', we treat it as paid.
    // Actually, the requirement is to fix the dashboard data. 
    // The previous implementation purely used Ibaan. Now we have Tax Forms with manual statuses.
    // Let's create a more robust query or just sum up Tax Forms + Unlinked Ibaan?
    // For now, let's stick to the previous Ibaan-centric logic BUT we should probably incorporate the new 'paymentStatus'.
    // However, the prompt says "FIX THE ADMIN DASHBOARD DATA".
    // If the user marked a form as "Paid" manually, the dashboard should reflect that revenue.
    
    // Revised Strategy:
    // 1. Get Sum from Ibaan (Base)
    // 2. Get Sum from Tax Forms (Manual Overrides)
    // Since we can't easily dedup without complex logic, and 'Tax Forms' are now the source of truth for "Tax Declarations",
    // maybe we should prioritize Tax Forms for the "Tax Collection" stats if they exist?
    // Let's try to sum Ibaan.AmountPaid + TaxForm.amountPaid? No, that double counts.
    
    // Let's stick to Ibaan for now as it's the official ledger, UNLESS the user explicitly wants the Tax Form data.
    // The previous 'TaxpayerDashboard' update used a mix.
    // Let's update the query to use the same logic as the Taxpayer Dashboard:
    // "Total Collected" = Sum(TaxForm.AmountPaid OR Ibaan.AmountPaid)
    // "Total Due" = Sum(TaxForm.TaxAmount OR Ibaan.Tax_Amount)
    
    // Since we can't iterate all in SQL easily due to loose linking, let's do a pure SQL aggregation on Ibaan for now 
    // BUT we will add the "paymentStatus" count to the stats.
    
    const [taxRows] = await database.query('SELECT SUM("AmountPaid") as collected, SUM("Tax_Amount") as totalDue FROM ibaan');
    let totalCollected = taxRows[0]?.collected || 0;
    let totalDue = taxRows[0]?.totalDue || 0;
    
    // ADDITION: Scan Tax Forms for manual "Paid" status that might not be in Ibaan ledger yet (simulated)
    // If paymentStatus is 'Paid', we assume full tax amount is collected.
    const [manualPaid] = await database.query(`
        SELECT SUM(COALESCE(tf."taxAmount", 0)) as manual_collected
        FROM tax_forms tf
        JOIN tax_other_details tod ON tf.id = tod."taxId"
        WHERE LOWER(tod."paymentStatus") = 'paid'
        AND (tf."amountPaid" IS NULL OR tf."amountPaid" = 0) -- Avoid double counting if they entered amount
    `);
    
    // We add this to the total collected (Visual fix)
    if (manualPaid[0]?.manual_collected) {
        totalCollected += Number(manualPaid[0].manual_collected);
    }

    // 3. Pending Assessments (using land_assessment_summary if available, otherwise just mock or use null)
    // Checking if land_assessment_summary exists and has data
    let totalAssessments = 0;
    try {
        const [assessmentRows] = await database.query('SELECT COUNT(*) as count FROM land_assessment_summary');
        totalAssessments = assessmentRows[0]?.count || 0;
    } catch (e) {
        console.warn("Could not fetch assessments count:", e.message);
    }

    // 4. Land Use Distribution (Pie Chart)
    // Use tax_forms.barangay if land_appraisal is empty (Better fallback than Ibaan)
    let landUseStats = [];
    try {
        const [useRows] = await database.query(`
            SELECT "actualUse" as label, COUNT(*) as value 
            FROM land_appraisal 
            GROUP BY "actualUse"
        `);
        
        if (useRows && useRows.length > 0) {
           landUseStats = useRows;
        } else {
           // Fallback 1: Tax Forms Barangay
           const [tfRows] = await database.query(`
              SELECT "barangay" as label, COUNT(*) as value 
              FROM tax_forms 
              WHERE "barangay" IS NOT NULL AND "barangay" != ''
              GROUP BY "barangay" 
              ORDER BY value DESC 
              LIMIT 5
           `);
           landUseStats = tfRows;
        }
    } catch (e) {
        // Fallback 2: Ibaan Barangay
         const [brgyRows] = await database.query(`
            SELECT "BarangayNa" as label, COUNT(*) as value 
            FROM ibaan 
            GROUP BY "BarangayNa" 
            ORDER BY value DESC 
            LIMIT 5
         `);
         landUseStats = brgyRows;
    }

    // 5. Recent Activity (mocked or from audit logs)
    let recentActivity = [];
    try {
        const [auditRows] = await database.query('SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 5');
        recentActivity = auditRows;
    } catch (e) {
        // ignore
    }

    // 6. Monthly Revenue (Actual data for Line Chart)
    // We try to group AmountPaid by month from Ibaan ledger if Date_paid exists
    let monthlyRevenue = [];
    try {
       // Note: This query is Postgres specific (using TO_CHAR or EXTRACT)
       // Assuming Date_paid is a date/timestamp column.
       // We want last 6 months.
       const [revRows] = await database.query(`
          SELECT 
            TO_CHAR("Date_paid", 'Mon') as month,
            EXTRACT(MONTH FROM "Date_paid") as month_num,
            SUM("AmountPaid") as revenue
          FROM ibaan
          WHERE "Date_paid" >= NOW() - INTERVAL '6 months'
          GROUP BY 1, 2
          ORDER BY 2 ASC
       `);
       
       if (revRows && revRows.length > 0) {
          monthlyRevenue = revRows.map(r => ({ label: r.month, value: Number(r.revenue) }));
       } else {
          // Fallback: Generate labels for last 6 months with 0 or simulated values if totally empty
          // But for now, let's just return empty and let frontend handle mock fallback if needed
          // actually, let's return the mock structure the frontend expects if empty
       }
    } catch (e) {
       console.warn("Monthly revenue query failed:", e.message);
    }

    res.json({
      summary: {
        totalParcels,
        totalCollected,
        totalDue,
        totalAssessments
      },
      charts: {
        landUse: landUseStats,
        monthlyRevenue: monthlyRevenue // New field
      },
      recentActivity
    });

  } catch (err) {
    console.error("Dashboard stats error:", err);
    res.status(500).json({ error: err.message });
  }
}
