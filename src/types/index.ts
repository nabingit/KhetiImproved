export interface User {
  id: string;
  name: string;
  email: string;
  contactNumber: string;
  userType: 'farmer' | 'worker';
  location?: string;
  dateOfBirth?: string;
  weight?: number; // in kg
  height?: number; // in cm
  profilePicture?: string; // base64 or URL
  workingPicture?: string; // base64 or URL
  createdAt: string;
}

export interface Job {
  id: string;
  farmerId: string;
  farmerName: string;
  title: string;
  description: string;
  preferredDate: string;
  wage: number;
  duration: number;
  durationType: 'hours' | 'days';
  location: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
  requiredWorkers: number;
  acceptedWorkerIds: string[];
  createdAt: string;
  status: 'open' | 'filled' | 'in-progress' | 'completed';
}

export interface Application {
  id: string;
  jobId: string;
  workerId: string;
  workerName: string;
  workerEmail: string;
  message?: string;
  status: 'pending' | 'accepted' | 'rejected';
  appliedAt: string;
  rejectedAt?: string;
}

export interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<boolean>;
  signup: (name: string, email: string, password: string, contactNumber: string, userType: 'farmer' | 'worker', location?: string, dateOfBirth?: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  loading: boolean;
  updateUser: (updates: Partial<User>) => void;
  getUserProfile: (userId: string) => Promise<User | null>;
}