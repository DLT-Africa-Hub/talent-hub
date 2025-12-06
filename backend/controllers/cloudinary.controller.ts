// cloudinaryController.ts
import { v2 as cloudinary } from 'cloudinary';
import { Request, Response } from 'express';

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Types
type ResourceType = 'image' | 'video' | 'raw';

interface DeleteFileRequest {
  url: string;
  resourceType?: ResourceType;
}

interface DeleteMultipleRequest {
  urls: (string | { url: string; resourceType?: ResourceType })[];
}

interface DeleteFolderRequest {
  folder: string;
  resourceType?: ResourceType;
}

interface DeleteResult {
  url?: string;
  publicId: string;
  resourceType: ResourceType;
  success: boolean;
  result?: string;
  error?: string;
}

const extractPublicId = (
  url: string,
  resourceType: ResourceType = 'image'
): string => {
  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname;

    const pathWithoutVersion = pathname.replace(/\/v\d+\//, '/');

    const uploadIndex = pathWithoutVersion.indexOf('/upload/');

    if (uploadIndex === -1) {
      throw new Error('Invalid Cloudinary URL format - missing /upload/');
    }

    let publicIdWithExtension = pathWithoutVersion.substring(uploadIndex + 8);

    publicIdWithExtension = decodeURIComponent(publicIdWithExtension);

    if (resourceType !== 'raw') {
      const lastDotIndex = publicIdWithExtension.lastIndexOf('.');
      if (lastDotIndex !== -1) {
        publicIdWithExtension = publicIdWithExtension.substring(
          0,
          lastDotIndex
        );
      }
    }

    return publicIdWithExtension;
  } catch (error) {
    throw new Error(`Failed to extract public_id: ${(error as Error).message}`);
  }
};

const detectResourceType = (url: string): ResourceType => {
  if (url.includes('/image/upload/')) return 'image';
  if (url.includes('/video/upload/')) return 'video';
  if (url.includes('/raw/upload/')) return 'raw';

  const extension = url.split('.').pop()?.toLowerCase();
  const rawExtensions = [
    'pdf',
    'doc',
    'docx',
    'xls',
    'xlsx',
    'ppt',
    'pptx',
    'txt',
    'csv',
    'json',
    'xml',
    'zip',
    'rar',
  ];
  const videoExtensions = ['mp4', 'mov', 'avi', 'webm', 'mkv'];

  if (extension && rawExtensions.includes(extension)) return 'raw';
  if (extension && videoExtensions.includes(extension)) return 'video';

  return 'image';
};

export const deleteFile = async (
  req: Request<Record<string, never>, Record<string, never>, DeleteFileRequest>,
  res: Response
): Promise<Response> => {
  try {
    const { url, resourceType } = req.body;

    if (!url) {
      return res.status(400).json({
        success: false,
        message: 'URL is required',
      });
    }

    const detectedType = resourceType || detectResourceType(url);

    const publicId = extractPublicId(url, detectedType);

    let result: { result?: string; deleted?: Record<string, string> };

    if (detectedType === 'raw') {
      result = await cloudinary.api.delete_resources([publicId], {
        resource_type: 'raw',
        type: 'upload',
        invalidate: true,
      });

      const deletedIds = result.deleted || {};
      const wasDeleted =
        deletedIds[publicId] === 'deleted' ||
        deletedIds[publicId] === 'not_found';

      if (wasDeleted) {
        return res.status(200).json({
          success: true,
          message: 'Raw file deleted successfully from Cloudinary',
          data: {
            publicId,
            resourceType: detectedType,
            result: deletedIds[publicId],
          },
        });
      } else {
        console.error('Failed to delete raw file:', result);
        return res.status(500).json({
          success: false,
          message: 'Failed to delete raw file from Cloudinary',
          error: result,
        });
      }
    } else {
      result = await cloudinary.uploader.destroy(publicId, {
        resource_type: detectedType,
        type: 'upload',
        invalidate: true,
      });

      if (result.result === 'ok') {
        return res.status(200).json({
          success: true,
          message: `${detectedType.charAt(0).toUpperCase() + detectedType.slice(1)} file deleted successfully`,
          data: {
            publicId,
            resourceType: detectedType,
            result: result.result,
          },
        });
      } else if (result.result === 'not found') {
        return res.status(200).json({
          success: true,
          message: 'File not found (may have been already deleted)',
          data: {
            publicId,
            resourceType: detectedType,
            result: result.result,
          },
        });
      }

      console.error('Unexpected Cloudinary result:', result);
      return res.status(500).json({
        success: false,
        message: 'Failed to delete file from Cloudinary',
        error: result,
      });
    }
  } catch (error) {
    console.error('Error deleting file:', error);
    return res.status(500).json({
      success: false,
      message: 'Error deleting file',
      error: (error as Error).message,
    });
  }
};

export const deleteMultipleFiles = async (
  req: Request<
    Record<string, never>,
    Record<string, never>,
    DeleteMultipleRequest
  >,
  res: Response
): Promise<Response> => {
  try {
    const { urls } = req.body;

    if (!urls || !Array.isArray(urls) || urls.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'URLs array is required',
      });
    }

    const filesByType: {
      [key in ResourceType]: { url: string; publicId: string }[];
    } = {
      image: [],
      video: [],
      raw: [],
    };

    urls.forEach((item) => {
      const url = typeof item === 'string' ? item : item.url;
      const resourceType =
        typeof item === 'object' ? item.resourceType : undefined;

      try {
        const detectedType = resourceType || detectResourceType(url);
        const publicId = extractPublicId(url, detectedType);

        filesByType[detectedType].push({ url, publicId });
      } catch (error) {
        console.error(`Failed to process URL: ${url}`, error);
      }
    });

    const results: DeleteResult[] = [];

    if (filesByType.raw.length > 0) {
      try {
        const publicIds = filesByType.raw.map((f) => f.publicId);

        const result = await cloudinary.api.delete_resources(publicIds, {
          resource_type: 'raw',
          type: 'upload',
          invalidate: true,
        });

        const deletedIds = result.deleted || {};
        filesByType.raw.forEach((file) => {
          const status = deletedIds[file.publicId];
          results.push({
            url: file.url,
            publicId: file.publicId,
            resourceType: 'raw',
            success: status === 'deleted' || status === 'not_found',
            result: status,
          });
        });
      } catch (error) {
        console.error('Error deleting raw files:', error);
        filesByType.raw.forEach((file) => {
          results.push({
            url: file.url,
            publicId: file.publicId,
            resourceType: 'raw',
            success: false,
            error: (error as Error).message,
          });
        });
      }
    }

    if (filesByType.image.length > 0) {
      const imagePromises = filesByType.image.map(
        async (file): Promise<DeleteResult> => {
          try {
            const result = await cloudinary.uploader.destroy(file.publicId, {
              resource_type: 'image',
              type: 'upload',
              invalidate: true,
            });

            return {
              url: file.url,
              publicId: file.publicId,
              resourceType: 'image',
              success: result.result === 'ok' || result.result === 'not found',
              result: result.result,
            };
          } catch (error) {
            return {
              url: file.url,
              publicId: file.publicId,
              resourceType: 'image',
              success: false,
              error: (error as Error).message,
            };
          }
        }
      );

      const imageResults = await Promise.all(imagePromises);
      results.push(...imageResults);
    }

    if (filesByType.video.length > 0) {
      const videoPromises = filesByType.video.map(
        async (file): Promise<DeleteResult> => {
          try {
            const result = await cloudinary.uploader.destroy(file.publicId, {
              resource_type: 'video',
              type: 'upload',
              invalidate: true,
            });

            return {
              url: file.url,
              publicId: file.publicId,
              resourceType: 'video',
              success: result.result === 'ok' || result.result === 'not found',
              result: result.result,
            };
          } catch (error) {
            return {
              url: file.url,
              publicId: file.publicId,
              resourceType: 'video',
              success: false,
              error: (error as Error).message,
            };
          }
        }
      );

      const videoResults = await Promise.all(videoPromises);
      results.push(...videoResults);
    }

    const successCount = results.filter((r) => r.success).length;
    const failureCount = results.length - successCount;

    return res.status(200).json({
      success: true,
      message: `Deleted ${successCount} file(s), ${failureCount} failed`,
      data: {
        total: results.length,
        successful: successCount,
        failed: failureCount,
        results,
      },
    });
  } catch (error) {
    console.error('Error deleting multiple files:', error);
    return res.status(500).json({
      success: false,
      message: 'Error deleting files',
      error: (error as Error).message,
    });
  }
};

export const deleteFolder = async (
  req: Request<
    Record<string, never>,
    Record<string, never>,
    DeleteFolderRequest
  >,
  res: Response
): Promise<Response> => {
  try {
    const { folder, resourceType = 'image' } = req.body;

    if (!folder) {
      return res.status(400).json({
        success: false,
        message: 'Folder path is required',
      });
    }

    const result = await cloudinary.api.delete_resources_by_prefix(folder, {
      resource_type: resourceType,
      invalidate: true,
    });

    try {
      await cloudinary.api.delete_folder(folder);
    } catch (folderError) {
      console.log('Folder may not be empty or already deleted');
    }

    return res.status(200).json({
      success: true,
      message: `Folder '${folder}' deleted successfully`,
      data: result,
    });
  } catch (error) {
    console.error('Error deleting folder:', error);
    return res.status(500).json({
      success: false,
      message: 'Error deleting folder',
      error: (error as Error).message,
    });
  }
};
