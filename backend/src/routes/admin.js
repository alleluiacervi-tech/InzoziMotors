const express = require('express');
const pool = require('../db');
const { requireAdmin } = require('../middleware/auth');

const router = express.Router();

// GET /admin/stats — dashboard overview numbers
router.get('/stats', requireAdmin, async (req, res) => {
  try {
    const [
      listingsRes, submissionsRes, handoversRes,
      usersRes, soldRes, revenueRes,
    ] = await Promise.all([
      pool.query("SELECT COUNT(*) FROM cars WHERE status = 'live'"),
      pool.query("SELECT COUNT(*) FROM submissions WHERE status = 'under_review'"),
      pool.query("SELECT COUNT(*) FROM handovers WHERE status = 'pending'"),
      pool.query("SELECT COUNT(*) FROM users WHERE id_verified = 'pending'"),
      pool.query("SELECT COUNT(*) FROM cars WHERE status = 'sold'"),
      pool.query("SELECT COUNT(*) AS total_sales, SUM(price) AS total_value FROM cars WHERE status = 'sold'"),
    ]);

    res.json({
      live_listings:       parseInt(listingsRes.rows[0].count),
      pending_submissions: parseInt(submissionsRes.rows[0].count),
      pending_handovers:   parseInt(handoversRes.rows[0].count),
      pending_id_verifs:   parseInt(usersRes.rows[0].count),
      total_sold:          parseInt(soldRes.rows[0].count),
      total_sales:         parseInt(revenueRes.rows[0].total_sales || 0),
      total_value_usd:     parseInt(revenueRes.rows[0].total_value || 0),
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /admin/analytics — charts data
router.get('/analytics', requireAdmin, async (req, res) => {
  try {
    const [makesRes, pipelineRes, centersRes, monthlyRes] = await Promise.all([
      // Top makes by listing count
      pool.query(`
        SELECT make, COUNT(*) AS count
        FROM cars WHERE status != 'archived'
        GROUP BY make ORDER BY count DESC LIMIT 8
      `),
      // Submission pipeline funnel
      pool.query(`
        SELECT status, COUNT(*) AS count
        FROM submissions GROUP BY status
      `),
      // Inspections by center
      pool.query(`
        SELECT center, COUNT(*) AS count,
               COUNT(*) FILTER (WHERE status = 'complete') AS completed
        FROM inspections GROUP BY center
      `),
      // Monthly sales (last 6 months)
      pool.query(`
        SELECT TO_CHAR(sold_at, 'Mon YYYY') AS month,
               COUNT(*) AS count,
               SUM(price) AS value
        FROM cars WHERE status = 'sold'
          AND sold_at > NOW() - INTERVAL '6 months'
        GROUP BY month, DATE_TRUNC('month', sold_at)
        ORDER BY DATE_TRUNC('month', sold_at) ASC
      `),
    ]);

    res.json({
      top_makes:       makesRes.rows,
      pipeline_funnel: pipelineRes.rows,
      centers:         centersRes.rows,
      monthly_sales:   monthlyRes.rows,
    });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
