
import mongoose from 'mongoose'

const ChapterSchema = new mongoose.Schema({
  idx: { type: Number, required: true },
  title: { type: String, required: true },
  keyPoints: { type: [String], default: [] },
  aiContent: { type: String, required: true },
  humanEdit: { type: String, default: null },
  version: { type: Number, default: 1 },
  updatedAt: { type: Date, default: Date.now }
}, { _id: false });

const BookSchema = new mongoose.Schema({
  summary: String,
  suggestedTitle: String,
  status: { 
    type: String, 
    enum: ['draft', 'generating', 'generated', 'published'],
    lowercase: true
  },
  chapters: { type: [ChapterSchema], default: [] },
  chatState: { type: mongoose.Schema.Types.Mixed, default: {} },
}, {
  timestamps: true
});

export const Book = mongoose.model('Book', BookSchema);
