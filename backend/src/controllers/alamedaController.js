import { database } from '../config/database.js';

export async function getAllAlameda (req, res) {
  try {
    const [data] = await database.query('SELECT * FROM alameda');
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function getAlamedaById (req, res) {
  try {
    const [data] = await database.execute('SELECT * FROM alameda WHERE parcelid = ?', [req.params.id]);
    if (data.length === 0) {
      return res.status(404).json({ error: "Data not found" });
    }
    res.json(data[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function editAlamedaById (req, res) {
  try {
    const { id } = req.params;
  const data = req.body;

  const sql = `
    UPDATE alameda SET
      ParcelId = ?, LotNumber = ?, BlockNumber = ?, SurveyPlan = ?, Claimant = ?, BarangayNa = ?, Area = ?,
      IsValidate = ?, Application = ?, PlaCount = ?, ApplicantN = ?, IsApproved = ?, IsReconstr = ?, Verified = ?, IsDocument = ?,
      ProjectId = ?, ParcelSour = ?, BarangayCo = ?, TiePointId = ?, TiePointNa = ?, Municipality = ?, Municipal1 = ?, LotStatus = ?,
      TypeI = ?, BranchesI = ?, Coordinate = ?, XI = ?, YI = ?, LongitudeI = ?, LatitudeI = ?, LengthI = ?, AreaI = ?, BearingI = ?,
      SelectionM = ?, SelectionI = ?, VersionI = ?, geometry = ?
    WHERE ParcelId = ?;
  `;

  database.query(sql, [
    data.ParcelId, data.LotNumber, data.BlockNumber, data.SurveyPlan, data.Claimant, data.BarangayNa, data.Area,
    data.IsValidate, data.Application, data.PlaCount, data.ApplicantN, data.IsApproved, data.IsReconstr, data.Verified, data.IsDocument,
    data.ProjectId, data.ParcelSour, data.BarangayCo, data.TiePointId, data.TiePointNa, data.Municipality, data.Municipal1, data.LotStatus,
    data.TypeI, data.BranchesI, data.Coordinate, data.XI, data.YI, data.LongitudeI, data.LatitudeI, data.LengthI, data.AreaI, data.BearingI,
    data.SelectionM, data.SelectionI, data.VersionI, JSON.stringify(data.geometry || null),
    id
  ], (err, result) => {
    if (err) {
      console.error(err);
      res.status(500).json({ error: "Database update failed" });
    } else {
      res.status(200).json({ message: "Parcel updated successfully" });
    }
  });
    res.json(data[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}


export async function search(req, res) {
  try {
    let value = req.params.value;
    const [data] = await database.execute('SELECT * FROM alameda WHERE parcelid like (?) or claimant like (?) or barangayna like (?)', [value,value,value]);
    if (data.length === 0) {
      return res.json({ ID: 0, message: 'Data not found.'});
    }
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}