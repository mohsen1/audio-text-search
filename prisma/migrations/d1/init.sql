-- CreateTable
CREATE TABLE "audio_search_accounts" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,
    "oauth_token_secret" TEXT,
    "oauth_token" TEXT,
    CONSTRAINT "audio_search_accounts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "audio_search_users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "audio_search_sessions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" DATETIME NOT NULL,
    CONSTRAINT "audio_search_sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "audio_search_users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "audio_search_users" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT,
    "username" TEXT NOT NULL,
    "email" TEXT,
    "emailVerified" DATETIME,
    "image" TEXT,
    "password" TEXT,
    "elevenlabsApiKey" TEXT
);

-- CreateTable
CREATE TABLE "audio_search_audio_files" (
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
    CONSTRAINT "audio_search_audio_files_userId_fkey" FOREIGN KEY ("userId") REFERENCES "audio_search_users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "audio_search_transcript_words" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "audioFileId" TEXT NOT NULL,
    "word" TEXT NOT NULL,
    "startTime" REAL NOT NULL,
    "endTime" REAL NOT NULL,
    "wordIndex" INTEGER NOT NULL,
    CONSTRAINT "audio_search_transcript_words_audioFileId_fkey" FOREIGN KEY ("audioFileId") REFERENCES "audio_search_audio_files" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "audio_search_verification_tokens" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "audio_search_accounts_provider_providerAccountId_key" ON "audio_search_accounts"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "audio_search_sessions_sessionToken_key" ON "audio_search_sessions"("sessionToken");

-- CreateIndex
CREATE UNIQUE INDEX "audio_search_users_username_key" ON "audio_search_users"("username");

-- CreateIndex
CREATE INDEX "audio_search_transcript_words_audioFileId_wordIndex_idx" ON "audio_search_transcript_words"("audioFileId", "wordIndex");

-- CreateIndex
CREATE INDEX "audio_search_transcript_words_audioFileId_word_idx" ON "audio_search_transcript_words"("audioFileId", "word");

-- CreateIndex
CREATE UNIQUE INDEX "audio_search_verification_tokens_token_key" ON "audio_search_verification_tokens"("token");

-- CreateIndex
CREATE UNIQUE INDEX "audio_search_verification_tokens_identifier_token_key" ON "audio_search_verification_tokens"("identifier", "token");

