import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  IconButton,
  Chip,
  LinearProgress,
  Avatar,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  ListItemSecondaryAction,
  Divider,
  Button,
  useTheme
} from '@mui/material';
import {
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  People as PeopleIcon,
  EventNote as EventNoteIcon,
  Assignment as AssignmentIcon,
  LocalHospital as LocalHospitalIcon,
  Schedule as ScheduleIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  MoreVert as MoreVertIcon,
  ArrowForward as ArrowForwardIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';

// Base widget interface
export interface BaseWidgetProps {
  title: string;
  loading?: boolean;
  error?: string | null;
  onRefresh?: () => void;
  className?: string;
}

// Stat widget for displaying key metrics
export interface StatWidgetProps extends BaseWidgetProps {
  value: number | string;
  change?: number;
  changeLabel?: string;
  icon?: React.ReactNode;
  color?: 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info';
  subtitle?: string;
  trend?: 'up' | 'down' | 'neutral';
}

export const StatWidget: React.FC<StatWidgetProps> = ({
  title,
  value,
  change,
  changeLabel,
  icon,
  color = 'primary',
  subtitle,
  trend = 'neutral',
  loading = false,
  error,
  onRefresh,
  className
}) => {
  const theme = useTheme();

  const getTrendIcon = () => {
    switch (trend) {
      case 'up':
        return <TrendingUpIcon fontSize="small" color="success" />;
      case 'down':
        return <TrendingDownIcon fontSize="small" color="error" />;
      default:
        return null;
    }
  };

  const getTrendColor = () => {
    switch (trend) {
      case 'up':
        return theme.palette.success.main;
      case 'down':
        return theme.palette.error.main;
      default:
        return theme.palette.text.secondary;
    }
  };

  if (loading) {
    return (
      <Card className={className}>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
            <Typography variant="h6" color="text.secondary">
              {title}
            </Typography>
            {icon && (
              <Avatar sx={{ bgcolor: `${color}.main`, width: 40, height: 40 }}>
                {icon}
              </Avatar>
            )}
          </Box>
          <LinearProgress />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={className}>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6" color="error">
              Error
            </Typography>
            {onRefresh && (
              <IconButton size="small" onClick={onRefresh}>
                <RefreshIcon />
              </IconButton>
            )}
          </Box>
          <Typography variant="body2" color="text.secondary">
            {error}
          </Typography>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card 
      className={className}
      sx={{
        transition: 'all 0.2s ease',
        '&:hover': {
          transform: 'translateY(-2px)',
          boxShadow: theme.shadows[4]
        }
      }}
    >
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Box sx={{ flex: 1 }}>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              {title}
            </Typography>
            <Typography variant="h4" sx={{ fontWeight: 600, color: `${color}.main` }}>
              {value}
            </Typography>
            {subtitle && (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                {subtitle}
              </Typography>
            )}
            {(change !== undefined || changeLabel) && (
              <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                {getTrendIcon()}
                <Typography 
                  variant="body2" 
                  sx={{ 
                    ml: 0.5, 
                    color: getTrendColor(),
                    fontWeight: 500
                  }}
                >
                  {change !== undefined && `${change > 0 ? '+' : ''}${change}%`}
                  {changeLabel && ` ${changeLabel}`}
                </Typography>
              </Box>
            )}
          </Box>
          {icon && (
            <Avatar 
              sx={{ 
                bgcolor: `${color}.main`, 
                width: 48, 
                height: 48,
                transition: 'transform 0.2s ease',
                '&:hover': { transform: 'scale(1.1)' }
              }}
            >
              {icon}
            </Avatar>
          )}
        </Box>
      </CardContent>
    </Card>
  );
};

// Recent activity widget
export interface ActivityItem {
  id: string;
  title: string;
  subtitle: string;
  time: string;
  icon?: React.ReactNode;
  color?: string;
  onClick?: () => void;
}

export interface ActivityWidgetProps extends BaseWidgetProps {
  activities: ActivityItem[];
  maxItems?: number;
  showViewAll?: boolean;
  onViewAll?: () => void;
}

export const ActivityWidget: React.FC<ActivityWidgetProps> = ({
  title,
  activities,
  maxItems = 5,
  showViewAll = true,
  onViewAll,
  loading = false,
  error,
  onRefresh,
  className
}) => {
  const displayedActivities = activities.slice(0, maxItems);

  if (loading) {
    return (
      <Card className={className}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            {title}
          </Typography>
          <LinearProgress />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardContent sx={{ pb: 1 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6">
            {title}
          </Typography>
          <Box>
            {onRefresh && (
              <IconButton size="small" onClick={onRefresh}>
                <RefreshIcon />
              </IconButton>
            )}
            <IconButton size="small">
              <MoreVertIcon />
            </IconButton>
          </Box>
        </Box>

        {error ? (
          <Typography variant="body2" color="error">
            {error}
          </Typography>
        ) : (
          <>
            <List dense>
              {displayedActivities.map((activity, index) => (
                <React.Fragment key={activity.id}>
                  <ListItem 
                    button={!!activity.onClick}
                    onClick={activity.onClick}
                    sx={{ 
                      px: 0,
                      py: 1,
                      borderRadius: 1,
                      transition: 'all 0.2s ease',
                      '&:hover': {
                        backgroundColor: 'action.hover'
                      }
                    }}
                  >
                    {activity.icon && (
                      <ListItemAvatar>
                        <Avatar 
                          sx={{ 
                            bgcolor: activity.color || 'primary.main',
                            width: 32, 
                            height: 32 
                          }}
                        >
                          {activity.icon}
                        </Avatar>
                      </ListItemAvatar>
                    )}
                    <ListItemText
                      primary={
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          {activity.title}
                        </Typography>
                      }
                      secondary={
                        <Typography variant="caption" color="text.secondary">
                          {activity.subtitle}
                        </Typography>
                      }
                    />
                    <ListItemSecondaryAction>
                      <Typography variant="caption" color="text.secondary">
                        {activity.time}
                      </Typography>
                    </ListItemSecondaryAction>
                  </ListItem>
                  {index < displayedActivities.length - 1 && <Divider />}
                </React.Fragment>
              ))}
            </List>

            {activities.length === 0 && (
              <Box sx={{ textAlign: 'center', py: 3 }}>
                <Typography variant="body2" color="text.secondary">
                  No hay actividad reciente
                </Typography>
              </Box>
            )}

            {showViewAll && activities.length > maxItems && (
              <Box sx={{ pt: 1 }}>
                <Button 
                  fullWidth 
                  size="small" 
                  endIcon={<ArrowForwardIcon />}
                  onClick={onViewAll}
                >
                  Ver todo ({activities.length})
                </Button>
              </Box>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};

// Progress widget for tracking completion
export interface ProgressWidgetProps extends BaseWidgetProps {
  progress: number;
  target?: number;
  unit?: string;
  color?: 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info';
  showPercentage?: boolean;
  subtitle?: string;
  details?: Array<{ label: string; value: number; color?: string }>;
}

export const ProgressWidget: React.FC<ProgressWidgetProps> = ({
  title,
  progress,
  target,
  unit = '',
  color = 'primary',
  showPercentage = true,
  subtitle,
  details = [],
  loading = false,
  error,
  onRefresh,
  className
}) => {
  const percentage = target ? Math.round((progress / target) * 100) : progress;
  const isComplete = percentage >= 100;

  if (loading) {
    return (
      <Card className={className}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            {title}
          </Typography>
          <LinearProgress />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6">
            {title}
          </Typography>
          {onRefresh && (
            <IconButton size="small" onClick={onRefresh}>
              <RefreshIcon />
            </IconButton>
          )}
        </Box>

        {error ? (
          <Typography variant="body2" color="error">
            {error}
          </Typography>
        ) : (
          <>
            <Box sx={{ mb: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Typography variant="h4" sx={{ fontWeight: 600 }}>
                  {progress}{unit}
                  {target && (
                    <Typography component="span" variant="body1" color="text.secondary">
                      /{target}{unit}
                    </Typography>
                  )}
                </Typography>
                {showPercentage && (
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    {isComplete && <CheckCircleIcon color="success" sx={{ mr: 0.5 }} />}
                    <Typography variant="h6" color={isComplete ? 'success.main' : 'text.secondary'}>
                      {percentage}%
                    </Typography>
                  </Box>
                )}
              </Box>
              
              <LinearProgress 
                variant="determinate" 
                value={Math.min(percentage, 100)}
                color={isComplete ? 'success' : color}
                sx={{ 
                  height: 8, 
                  borderRadius: 4,
                  backgroundColor: 'action.hover'
                }}
              />
              
              {subtitle && (
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  {subtitle}
                </Typography>
              )}
            </Box>

            {details.length > 0 && (
              <Box>
                {details.map((detail, index) => (
                  <Box key={index} sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                    <Typography variant="body2" color="text.secondary">
                      {detail.label}
                    </Typography>
                    <Typography 
                      variant="body2" 
                      sx={{ 
                        fontWeight: 500,
                        color: detail.color || 'text.primary'
                      }}
                    >
                      {detail.value}{unit}
                    </Typography>
                  </Box>
                ))}
              </Box>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};

// Quick actions widget
export interface QuickAction {
  id: string;
  label: string;
  icon: React.ReactNode;
  color?: 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info';
  onClick: () => void;
  disabled?: boolean;
  badge?: number;
}

export interface QuickActionsWidgetProps extends BaseWidgetProps {
  actions: QuickAction[];
  layout?: 'grid' | 'list';
}

export const QuickActionsWidget: React.FC<QuickActionsWidgetProps> = ({
  title,
  actions,
  layout = 'grid',
  loading = false,
  error,
  className
}) => {
  if (loading) {
    return (
      <Card className={className}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            {title}
          </Typography>
          <LinearProgress />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          {title}
        </Typography>

        {error ? (
          <Typography variant="body2" color="error">
            {error}
          </Typography>
        ) : (
          <Box 
            sx={{ 
              display: layout === 'grid' ? 'grid' : 'flex',
              ...(layout === 'grid' && {
                gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
                gap: 1
              }),
              ...(layout === 'list' && {
                flexDirection: 'column',
                gap: 1
              })
            }}
          >
            {actions.map((action) => (
              <Button
                key={action.id}
                variant="outlined"
                onClick={action.onClick}
                disabled={action.disabled}
                startIcon={action.icon}
                color={action.color}
                sx={{
                  justifyContent: 'flex-start',
                  p: 1.5,
                  height: layout === 'grid' ? 80 : 'auto',
                  flexDirection: layout === 'grid' ? 'column' : 'row',
                  transition: 'all 0.2s ease',
                  '&:hover': {
                    transform: 'translateY(-2px)',
                    boxShadow: 2
                  }
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  {action.label}
                  {action.badge && action.badge > 0 && (
                    <Chip 
                      label={action.badge} 
                      size="small" 
                      color={action.color || 'primary'}
                    />
                  )}
                </Box>
              </Button>
            ))}
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

// Predefined medical dashboard widgets
export const MedicalDashboardWidgets = {
  TodayAppointments: (props: Omit<StatWidgetProps, 'icon'>) => (
    <StatWidget {...props} icon={<ScheduleIcon />} color="primary" />
  ),
  
  TotalPatients: (props: Omit<StatWidgetProps, 'icon'>) => (
    <StatWidget {...props} icon={<PeopleIcon />} color="success" />
  ),
  
  PendingStudies: (props: Omit<StatWidgetProps, 'icon'>) => (
    <StatWidget {...props} icon={<AssignmentIcon />} color="warning" />
  ),
  
  CompletedConsultations: (props: Omit<StatWidgetProps, 'icon'>) => (
    <StatWidget {...props} icon={<LocalHospitalIcon />} color="info" />
  )
};
