import React from 'react';
import { Card, CardContent, CardMedia, Typography, Chip, Box, Rating } from '@mui/material';
import { styled } from '@mui/material/styles';
import { Anime } from '../types/Anime';

interface AnimeCardProps {
  anime: Anime;
  onClick: (anime: Anime) => void;
}

const StyledCard = styled(Card)(({ theme }) => ({
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  transition: 'transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out',
  cursor: 'pointer',
  '&:hover': {
    transform: 'translateY(-4px)',
    boxShadow: theme.shadows[8],
  },
}));

const StyledCardMedia = styled(CardMedia)({
  height: 200,
  backgroundSize: 'cover',
  backgroundPosition: 'center',
  position: 'relative',
});

const StatusChip = styled(Chip)(({ theme, color }) => ({
  position: 'absolute',
  top: 8,
  right: 8,
  fontWeight: 'bold',
  fontSize: '0.75rem',
}));

const AnimeCard: React.FC<AnimeCardProps> = ({ anime, onClick }) => {
  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'ongoing':
        return 'primary';
      case 'completed':
        return 'success';
      case 'upcoming':
        return 'warning';
      default:
        return 'default';
    }
  };

  const getStatusText = (status: string) => {
    switch (status.toLowerCase()) {
      case 'ongoing':
        return 'Ongoing';
      case 'completed':
        return 'Completed';
      case 'upcoming':
        return 'Upcoming';
      default:
        return status;
    }
  };

  return (
    <StyledCard onClick={() => onClick(anime)}>
      <StyledCardMedia
        image={anime.imageUrl}
        title={anime.title}
      >
        <StatusChip
          label={getStatusText(anime.status)}
          color={getStatusColor(anime.status) as any}
          size="small"
        />
        {anime.rating && (
          <Box
            sx={{
              position: 'absolute',
              bottom: 8,
              left: 8,
              backgroundColor: 'rgba(0, 0, 0, 0.7)',
              borderRadius: 1,
              px: 1,
              py: 0.5,
            }}
          >
            <Rating
              value={anime.rating / 2}
              readOnly
              size="small"
              precision={0.1}
            />
          </Box>
        )}
      </StyledCardMedia>
      
      <CardContent sx={{ flexGrow: 1, p: 2 }}>
        <Typography
          variant="h6"
          component="h3"
          sx={{
            fontWeight: 'bold',
            fontSize: '1rem',
            lineHeight: 1.3,
            mb: 1,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {anime.title}
        </Typography>
        
        {anime.description && (
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{
              mb: 1,
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {anime.description}
          </Typography>
        )}
        
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 1 }}>
          {anime.genres.slice(0, 3).map((genre, index) => (
            <Chip
              key={index}
              label={genre}
              size="small"
              variant="outlined"
              sx={{ fontSize: '0.7rem', height: 20 }}
            />
          ))}
          {anime.genres.length > 3 && (
            <Chip
              label={`+${anime.genres.length - 3}`}
              size="small"
              variant="outlined"
              sx={{ fontSize: '0.7rem', height: 20 }}
            />
          )}
        </Box>
        
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {anime.currentEpisode && anime.totalEpisodes && (
            <Typography variant="caption" color="text.secondary">
              Episode {anime.currentEpisode}/{anime.totalEpisodes}
            </Typography>
          )}
          
          {anime.lastUpdated && (
            <Typography variant="caption" color="text.secondary">
              {new Date(anime.lastUpdated).toLocaleDateString()}
            </Typography>
          )}
        </Box>
      </CardContent>
    </StyledCard>
  );
};

export default AnimeCard;
