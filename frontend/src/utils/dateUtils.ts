import { FirebaseTimestamp } from '../types';

/**
 * Safely converts a Firebase timestamp to a Date object
 */
export const toDate = (timestamp: FirebaseTimestamp | Date | string | number | null | undefined): Date => {
  if (!timestamp) {
    return new Date();
  }

  // If it's already a Date object
  if (timestamp instanceof Date) {
    return timestamp;
  }

  // If it's a Firebase Timestamp with toDate method
  if (typeof timestamp === 'object' && 'toDate' in timestamp && typeof timestamp.toDate === 'function') {
    return timestamp.toDate();
  }

  // If it's a Firebase Timestamp with seconds property
  if (typeof timestamp === 'object' && 'seconds' in timestamp && typeof timestamp.seconds === 'number') {
    return new Date(timestamp.seconds * 1000);
  }

  // If it's a string or number
  if (typeof timestamp === 'string' || typeof timestamp === 'number') {
    return new Date(timestamp);
  }

  // Fallback to current date
  return new Date();
};

/**
 * Formats a Firebase timestamp to Vietnamese locale string
 */
export const formatDate = (timestamp: FirebaseTimestamp | Date | string | number | null | undefined, locale: string = 'vi-VN'): string => {
  const date = toDate(timestamp);
  return date.toLocaleDateString(locale);
};

/**
 * Formats a Firebase timestamp to Vietnamese locale date and time string
 */
export const formatDateTime = (timestamp: FirebaseTimestamp | Date | string | number | null | undefined, locale: string = 'vi-VN'): string => {
  const date = toDate(timestamp);
  return date.toLocaleString(locale);
};

/**
 * Formats a Firebase timestamp to time string
 */
export const formatTime = (timestamp: FirebaseTimestamp | Date | string | number | null | undefined, locale: string = 'vi-VN'): string => {
  const date = toDate(timestamp);
  return date.toLocaleTimeString(locale);
};

/**
 * Gets relative time string (e.g., "2 hours ago")
 */
export const getRelativeTime = (timestamp: FirebaseTimestamp | Date | string | number | null | undefined): string => {
  const date = toDate(timestamp);
  const now = new Date();
  const diff = now.getTime() - date.getTime();

  const minutes = Math.floor(diff / (1000 * 60));
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (minutes < 1) {
    return 'Vừa xong';
  } else if (minutes < 60) {
    return `${minutes} phút trước`;
  } else if (hours < 24) {
    return `${hours} giờ trước`;
  } else if (days < 7) {
    return `${days} ngày trước`;
  } else {
    return formatDate(timestamp);
  }
};

/**
 * Checks if a timestamp is today
 */
export const isToday = (timestamp: FirebaseTimestamp | Date | string | number | null | undefined): boolean => {
  const date = toDate(timestamp);
  const today = new Date();
  
  return date.getDate() === today.getDate() &&
         date.getMonth() === today.getMonth() &&
         date.getFullYear() === today.getFullYear();
};

/**
 * Checks if a timestamp is within the last N days
 */
export const isWithinDays = (timestamp: FirebaseTimestamp | Date | string | number | null | undefined, days: number): boolean => {
  const date = toDate(timestamp);
  const now = new Date();
  const diffTime = now.getTime() - date.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  return diffDays <= days;
};