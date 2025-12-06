import express from 'express';
import {
  deleteFile,
  deleteFolder,
  deleteMultipleFiles,
} from '../controllers/cloudinary.controller';

const router = express.Router();

router.post('/delete', deleteFile);
router.post('/delete-multiple', deleteMultipleFiles);
router.post('/delete-folder', deleteFolder);

export default router;
