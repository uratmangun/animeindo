import { Request, Response } from 'express';
import { AnimeService } from '../services/animeService';
import { SearchService } from '../services/searchService';
import { validatePagination, validateSearchQuery } from '../utils/validation';
import { logger } from '../utils/logger';

export class AnimeController {
  private animeService: AnimeService;
  private searchService: SearchService;

  constructor() {
    this.animeService = new AnimeService();
    this.searchService = new SearchService();
  }

  /**
   * Get all anime with pagination and filtering
   */
  async getAnimeList(req: Request, res: Response): Promise<void> {
    try {
      const { page = 1, limit = 20, category, status, sortBy = 'latest' } = req.query;
      
      const pagination = validatePagination({ page: Number(page), limit: Number(limit) });
      const filters = { category, status, sortBy: String(sortBy) };

      const result = await this.animeService.getAnimeList(pagination, filters);
      
      res.json({
        success: true,
        data: result.anime,
        pagination: {
          currentPage: pagination.page,
          totalPages: result.totalPages,
          totalItems: result.totalItems,
          hasNext: pagination.page < result.totalPages,
          hasPrev: pagination.page > 1
        }
      });
    } catch (error) {
      logger.error('Error fetching anime list:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  /**
   * Get specific anime by ID
   */
  async getAnimeById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const anime = await this.animeService.getAnimeById(id);
      
      if (!anime) {
        res.status(404).json({
          success: false,
          error: 'Anime not found'
        });
        return;
      }

      res.json({
        success: true,
        data: anime
      });
    } catch (error) {
      logger.error('Error fetching anime by ID:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  /**
   * Get episodes for specific anime
   */
  async getEpisodes(req: Request, res: Response): Promise<void> {
    try {
      const { animeId } = req.params;
      const { page = 1, limit = 50 } = req.query;
      
      const pagination = validatePagination({ page: Number(page), limit: Number(limit) });
      const episodes = await this.animeService.getEpisodes(animeId, pagination);
      
      res.json({
        success: true,
        data: episodes
      });
    } catch (error) {
      logger.error('Error fetching episodes:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  /**
   * Search anime by query
   */
  async searchAnime(req: Request, res: Response): Promise<void> {
    try {
      const { q, page = 1, limit = 20 } = req.query;
      
      if (!q || typeof q !== 'string') {
        res.status(400).json({
          success: false,
          error: 'Search query is required'
        });
        return;
      }

      const searchQuery = validateSearchQuery(q);
      const pagination = validatePagination({ page: Number(page), limit: Number(limit) });
      
      const results = await this.searchService.searchAnime(searchQuery, pagination);
      
      res.json({
        success: true,
        data: results.anime,
        pagination: {
          currentPage: pagination.page,
          totalPages: results.totalPages,
          totalItems: results.totalItems,
          query: searchQuery
        }
      });
    } catch (error) {
      logger.error('Error searching anime:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  /**
   * Get trending anime
   */
  async getTrendingAnime(req: Request, res: Response): Promise<void> {
    try {
      const { limit = 10 } = req.query;
      const trending = await this.animeService.getTrendingAnime(Number(limit));
      
      res.json({
        success: true,
        data: trending
      });
    } catch (error) {
      logger.error('Error fetching trending anime:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  /**
   * Get anime categories
   */
  async getCategories(req: Request, res: Response): Promise<void> {
    try {
      const categories = await this.animeService.getCategories();
      
      res.json({
        success: true,
        data: categories
      });
    } catch (error) {
      logger.error('Error fetching categories:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  /**
   * Update anime data (scraping endpoint)
   */
  async updateAnimeData(req: Request, res: Response): Promise<void> {
    try {
      const { page = 1, force = false } = req.query;
      
      const result = await this.animeService.scrapeAndUpdateAnimeData({
        page: Number(page),
        force: Boolean(force)
      });
      
      res.json({
        success: true,
        message: 'Anime data updated successfully',
        data: {
          scrapedCount: result.scrapedCount,
          updatedCount: result.updatedCount,
          errors: result.errors
        }
      });
    } catch (error) {
      logger.error('Error updating anime data:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }
}
