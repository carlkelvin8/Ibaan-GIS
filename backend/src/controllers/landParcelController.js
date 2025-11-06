import { database } from '../config/database.js';

export async function getAll(req, res) {
  try {
    const [data] = await database.query('SELECT * FROM landparcel');
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function addNew(req, res) {
  const {
    improvement,
    totalValue,
    StreetAddress,
    Barangay,
    Municipality,
    ZipCode,
    areaSize,
    propertyType,
    actualLandUse
  } = req.body;

  try {
    const sql = `
      INSERT INTO LandParcel (
        improvement, totalValue, StreetAddress, Barangay, Municipality, 
        ZipCode, areaSize, propertyType, actualLandUse
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const [result] = await database.query(sql, [
      improvement,
      totalValue,
      StreetAddress,
      Barangay,
      Municipality,
      ZipCode,
      areaSize,
      propertyType,
      actualLandUse
    ]);

    res.json({ message: "LandParcel added successfully", parcelID: result.insertId });
  } catch (err) {
    console.error("Error inserting data:", err);
    res.status(500).json({ error: "Database insert failed" });
  }
}

export async function getById(req, res) {
  try {
    const [data] = await database.execute(
      "SELECT * FROM landparcel WHERE parcelID = ?",
      [req.params.id]
    );

    if (data.length === 0) {
      return res.status(404).json({ error: "Data not found" });
    }

    res.json(data[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function editById(req, res) {
  try {
    const { id } = req.params;
    const {
      improvement,
      totalValue,
      StreetAddress,
      Barangay,
      Municipality,
      ZipCode,
      areaSize,
      propertyType,
      actualLandUse
    } = req.body;

    const sql = `
      UPDATE LandParcel 
      SET 
        improvement = ?, 
        totalValue = ?, 
        StreetAddress = ?, 
        Barangay = ?, 
        Municipality = ?, 
        ZipCode = ?, 
        areaSize = ?, 
        propertyType = ?, 
        actualLandUse = ?
      WHERE parcelID = ?
    `;

    const [result] = await database.query(sql, [
      improvement,
      totalValue,
      StreetAddress,
      Barangay,
      Municipality,
      ZipCode,
      areaSize,
      propertyType,
      actualLandUse,
      id
    ]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Not found" });
    }

    res.status(200).json({ message: "Parcel updated successfully" });
  } catch (err) {
    console.error("editById error:", err);
    res.status(500).json({ error: err.message });
  }
}

/** ✅ DELETE /api/landparcel/:id */
export async function removeById(req, res) {
  try {
    const { id } = req.params;
    const [result] = await database.query(
      "DELETE FROM landparcel WHERE parcelID = ?",
      [id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Not found" });
    }

    res.json({ message: "Parcel deleted successfully" });
  } catch (err) {
    console.error("removeById error:", err);
    res.status(500).json({ error: err.message });
  }
}
