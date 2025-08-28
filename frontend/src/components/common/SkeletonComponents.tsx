import React from 'react';
import {
  Box,
  Skeleton,
  Card,
  CardContent,
  TableContainer,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Avatar,
  Paper
} from '@mui/material';

// Generic skeleton row for tables
export const SkeletonTableRow: React.FC<{ columns: number }> = ({ columns }) => (
  <TableRow>
    {Array.from({ length: columns }, (_, index) => (
      <TableCell key={index}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          {index === 0 && (
            <Skeleton variant="circular">
              <Avatar />
            </Skeleton>
          )}
          <Box sx={{ flex: 1 }}>
            <Skeleton variant="text" width={index === 0 ? '60%' : '80%'} />
            {index === 0 && (
              <Skeleton variant="text" width="40%" height={20} />
            )}
          </Box>
        </Box>
      </TableCell>
    ))}
  </TableRow>
);

// Patients table skeleton
export const PatientsTableSkeleton: React.FC = () => (
  <Paper>
    <TableContainer>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell><Skeleton variant="text" width="80%" /></TableCell>
            <TableCell><Skeleton variant="text" width="60%" /></TableCell>
            <TableCell><Skeleton variant="text" width="70%" /></TableCell>
            <TableCell><Skeleton variant="text" width="90%" /></TableCell>
            <TableCell><Skeleton variant="text" width="50%" /></TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {Array.from({ length: 5 }, (_, index) => (
            <SkeletonTableRow key={index} columns={5} />
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  </Paper>
);

// Consultations table skeleton
export const ConsultationsTableSkeleton: React.FC = () => (
  <Paper>
    <TableContainer>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell><Skeleton variant="text" width="70%" /></TableCell>
            <TableCell><Skeleton variant="text" width="60%" /></TableCell>
            <TableCell><Skeleton variant="text" width="80%" /></TableCell>
            <TableCell><Skeleton variant="text" width="50%" /></TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {Array.from({ length: 5 }, (_, index) => (
            <SkeletonTableRow key={index} columns={4} />
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  </Paper>
);

// Dashboard widget skeleton
export const DashboardWidgetSkeleton: React.FC = () => (
  <Card>
    <CardContent>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
        <Box>
          <Skeleton variant="text" width={120} height={24} />
          <Skeleton variant="text" width={80} height={40} />
        </Box>
        <Skeleton variant="circular" width={40} height={40} />
      </Box>
      <Skeleton variant="text" width="60%" height={20} />
    </CardContent>
  </Card>
);

// Dashboard grid skeleton
export const DashboardSkeleton: React.FC = () => (
  <Box>
    {/* Header skeleton */}
    <Box sx={{ mb: 3 }}>
      <Skeleton variant="text" width={200} height={40} />
      <Skeleton variant="text" width={300} height={24} />
    </Box>

    {/* Stats grid skeleton */}
    <Box sx={{ 
      display: 'grid', 
      gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', lg: '1fr 1fr 1fr 1fr' },
      gap: 3,
      mb: 4 
    }}>
      {Array.from({ length: 4 }, (_, index) => (
        <DashboardWidgetSkeleton key={index} />
      ))}
    </Box>

    {/* Charts section skeleton */}
    <Box sx={{ 
      display: 'grid', 
      gridTemplateColumns: { xs: '1fr', lg: '2fr 1fr' },
      gap: 3,
      mb: 4 
    }}>
      <Card>
        <CardContent>
          <Skeleton variant="text" width={150} height={32} sx={{ mb: 2 }} />
          <Skeleton variant="rectangular" height={300} />
        </CardContent>
      </Card>
      <Card>
        <CardContent>
          <Skeleton variant="text" width={120} height={32} sx={{ mb: 2 }} />
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {Array.from({ length: 5 }, (_, index) => (
              <Box key={index} sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Skeleton variant="circular" width={32} height={32} />
                <Box sx={{ flex: 1 }}>
                  <Skeleton variant="text" width="80%" />
                  <Skeleton variant="text" width="60%" height={20} />
                </Box>
              </Box>
            ))}
          </Box>
        </CardContent>
      </Card>
    </Box>
  </Box>
);

// Form skeleton for dialogs
export const FormSkeleton: React.FC<{ fields?: number }> = ({ fields = 6 }) => (
  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, p: 3 }}>
    {Array.from({ length: fields }, (_, index) => (
      <Box key={index}>
        <Skeleton variant="text" width="30%" height={20} sx={{ mb: 1 }} />
        <Skeleton variant="rectangular" height={56} />
      </Box>
    ))}
  </Box>
);

// Patient card skeleton
export const PatientCardSkeleton: React.FC = () => (
  <Card>
    <CardContent>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
        <Skeleton variant="circular">
          <Avatar sx={{ width: 56, height: 56 }} />
        </Skeleton>
        <Box sx={{ flex: 1 }}>
          <Skeleton variant="text" width="70%" height={24} />
          <Skeleton variant="text" width="40%" height={20} />
        </Box>
      </Box>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Skeleton variant="circular" width={16} height={16} />
          <Skeleton variant="text" width="60%" />
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Skeleton variant="circular" width={16} height={16} />
          <Skeleton variant="text" width="80%" />
        </Box>
      </Box>
    </CardContent>
  </Card>
);

// List skeleton for general use
export const ListSkeleton: React.FC<{ items?: number; showAvatar?: boolean }> = ({ 
  items = 5, 
  showAvatar = true 
}) => (
  <Box>
    {Array.from({ length: items }, (_, index) => (
      <Box key={index} sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2, p: 2 }}>
        {showAvatar && (
          <Skeleton variant="circular">
            <Avatar />
          </Skeleton>
        )}
        <Box sx={{ flex: 1 }}>
          <Skeleton variant="text" width="80%" />
          <Skeleton variant="text" width="60%" height={20} />
        </Box>
        <Skeleton variant="rectangular" width={80} height={32} />
      </Box>
    ))}
  </Box>
);

// Search results skeleton
export const SearchResultsSkeleton: React.FC = () => (
  <Box>
    {/* Search summary skeleton */}
    <Box sx={{ mb: 2 }}>
      <Skeleton variant="text" width={200} height={20} />
    </Box>
    
    {/* Results skeleton */}
    <ListSkeleton items={3} />
  </Box>
);

// Consultation detail skeleton
export const ConsultationDetailSkeleton: React.FC = () => (
  <Box sx={{ p: 3 }}>
    {/* Header */}
    <Box sx={{ mb: 4 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
        <Skeleton variant="circular">
          <Avatar sx={{ width: 64, height: 64 }} />
        </Skeleton>
        <Box>
          <Skeleton variant="text" width={200} height={32} />
          <Skeleton variant="text" width={150} height={24} />
        </Box>
      </Box>
      <Skeleton variant="text" width={100} height={20} />
    </Box>

    {/* Sections */}
    {Array.from({ length: 4 }, (_, index) => (
      <Box key={index} sx={{ mb: 4 }}>
        <Skeleton variant="text" width={150} height={28} sx={{ mb: 2 }} />
        <Box sx={{ pl: 2 }}>
          <Skeleton variant="text" width="100%" />
          <Skeleton variant="text" width="80%" />
          <Skeleton variant="text" width="90%" />
        </Box>
      </Box>
    ))}
  </Box>
);

// Appointment skeleton
export const AppointmentSkeleton: React.FC = () => (
  <Card>
    <CardContent>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', mb: 2 }}>
        <Box>
          <Skeleton variant="text" width={120} height={24} />
          <Skeleton variant="text" width={80} height={20} />
        </Box>
        <Skeleton variant="rectangular" width={60} height={24} />
      </Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <Skeleton variant="circular" width={32} height={32} />
        <Box sx={{ flex: 1 }}>
          <Skeleton variant="text" width="70%" />
          <Skeleton variant="text" width="50%" height={20} />
        </Box>
      </Box>
    </CardContent>
  </Card>
);
