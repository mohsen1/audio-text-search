/*
  Warnings:

  - You are about to drop the column `filePath` on the `AudioFile` table. All the data in the column will be lost.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_AudioFile" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "fileName" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "mimeType" TEXT NOT NULL,
    "transcription" TEXT,
    "transcriptData" TEXT,
    "uploadedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'processing',
    "userId" TEXT NOT NULL,
    CONSTRAINT "AudioFile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_AudioFile" ("fileName", "fileSize", "id", "mimeType", "originalName", "processedAt", "status", "transcriptData", "transcription", "uploadedAt", "userId") SELECT "fileName", "fileSize", "id", "mimeType", "originalName", "processedAt", "status", "transcriptData", "transcription", "uploadedAt", "userId" FROM "AudioFile";
DROP TABLE "AudioFile";
ALTER TABLE "new_AudioFile" RENAME TO "AudioFile";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
