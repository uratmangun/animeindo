import mongoose, { Document, Schema } from 'mongoose';

export interface IAnime extends Document {
  title: string;
  slug: string;
  description?: string;
  imageUrl: string;
  status: 'ongoing' | 'completed' | 'upcoming';
  genres: string[];
  categories: string[];
  releaseDate?: Date;
  rating?: number;
  totalEpisodes?: number;
  currentEpisode?: number;
  lastUpdated: Date;
  scrapedAt: Date;
  isActive: boolean;
  metadata: {
    originalUrl: string;
    source: string;
    tags: string[];
    duration?: number;
    studio?: string;
    director?: string;
  };
}

const AnimeSchema: Schema = new Schema({
  title: {
    type: String,
    required: true,
    index: true,
    trim: true
  },
  slug: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  description: {
    type: String,
    trim: true
  },
  imageUrl: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['ongoing', 'completed', 'upcoming'],
    default: 'ongoing',
    index: true
  },
  genres: [{
    type: String,
    trim: true,
    lowercase: true
  }],
  categories: [{
    type: String,
    trim: true,
    lowercase: true
  }],
  releaseDate: {
    type: Date
  },
  rating: {
    type: Number,
    min: 0,
    max: 10
  },
  totalEpisodes: {
    type: Number,
    min: 0
  },
  currentEpisode: {
    type: Number,
    min: 0
  },
  lastUpdated: {
    type: Date,
    default: Date.now,
    index: true
  },
  scrapedAt: {
    type: Date,
    default: Date.now
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
  metadata: {
    originalUrl: {
      type: String,
      required: true
    },
    source: {
      type: String,
      default: 'animeindo'
    },
    tags: [String],
    duration: Number,
    studio: String,
    director: String
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better query performance
AnimeSchema.index({ title: 'text', description: 'text' });
AnimeSchema.index({ genres: 1 });
AnimeSchema.index({ categories: 1 });
AnimeSchema.index({ status: 1, lastUpdated: -1 });
AnimeSchema.index({ 'metadata.source': 1 });

// Virtual for episode progress
AnimeSchema.virtual('episodeProgress').get(function() {
  if (this.totalEpisodes && this.currentEpisode) {
    return Math.round((this.currentEpisode / this.totalEpisodes) * 100);
  }
  return 0;
});

// Static methods
AnimeSchema.statics.findBySlug = function(slug: string) {
  return this.findOne({ slug, isActive: true });
};

AnimeSchema.statics.findByGenre = function(genre: string, limit = 20) {
  return this.find({ 
    genres: genre.toLowerCase(), 
    isActive: true 
  }).limit(limit).sort({ lastUpdated: -1 });
};

AnimeSchema.statics.findTrending = function(limit = 10) {
  return this.find({ 
    isActive: true,
    status: { $in: ['ongoing', 'completed'] }
  })
  .sort({ 
    lastUpdated: -1,
    rating: -1 
  })
  .limit(limit);
};

// Instance methods
AnimeSchema.methods.updateEpisode = function(episodeNumber: number) {
  this.currentEpisode = episodeNumber;
  this.lastUpdated = new Date();
  return this.save();
};

AnimeSchema.methods.addGenre = function(genre: string) {
  if (!this.genres.includes(genre.toLowerCase())) {
    this.genres.push(genre.toLowerCase());
  }
  return this.save();
};

export const Anime = mongoose.model<IAnime>('Anime', AnimeSchema);
