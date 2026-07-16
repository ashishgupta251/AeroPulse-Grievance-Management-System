import express from "express";
import {
  getAllGrievances,
  createGrievance,
  updateGrievance,
  deleteGrievance,
} from "../controllers/grievanceController.js";

const router = express.Router();

router.get("/", getAllGrievances);
router.post("/", createGrievance);
router.put("/:id", updateGrievance);
router.delete("/:id", deleteGrievance);

export default router;
