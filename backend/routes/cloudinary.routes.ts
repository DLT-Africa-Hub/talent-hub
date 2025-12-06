import express, { type IRouter } from 'express';
import {
  deleteFile,
  deleteFolder,
  deleteMultipleFiles,
} from '../controllers/cloudinary.controller';

const router: IRouter = express.Router();

router.post('/delete', deleteFile);
router.post('/delete-multiple', deleteMultipleFiles);
router.post('/delete-folder', deleteFolder);

export default router;
