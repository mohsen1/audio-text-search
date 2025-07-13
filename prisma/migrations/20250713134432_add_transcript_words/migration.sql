-- CreateTable
CREATE TABLE "TranscriptWord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "audioFileId" TEXT NOT NULL,
    "word" TEXT NOT NULL,
    "startTime" REAL NOT NULL,
    "endTime" REAL NOT NULL,
    "wordIndex" INTEGER NOT NULL,
    CONSTRAINT "TranscriptWord_audioFileId_fkey" FOREIGN KEY ("audioFileId") REFERENCES "AudioFile" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "TranscriptWord_audioFileId_wordIndex_idx" ON "TranscriptWord"("audioFileId", "wordIndex");

-- CreateIndex
CREATE INDEX "TranscriptWord_audioFileId_word_idx" ON "TranscriptWord"("audioFileId", "word");
