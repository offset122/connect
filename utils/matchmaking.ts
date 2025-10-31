
/**
 * Matchmaking Algorithm for Hanna's Connect
 * Calculates compatibility percentage between two users based on their registration details
 */

interface UserProfile {
  gender?: string | null;
  age?: number | null;
  sexual_orientation?: string | null;
  relationship_goal?: string | null;
  county?: string | null;
  city?: string | null;
  religion?: string | null;
  religiousness?: string | null;
  believe_in_marriage?: string | null;
  education_level?: string | null;
  employment_status?: string | null;
  financial_stability?: string | null;
  marital_status?: string | null;
  number_of_children?: number | null;
  open_to_dating_with_children?: string | null;
  want_kids?: string | null;
  smoking?: string | null;
  alcohol_consumption?: string | null;
  can_relocate?: string | null;
  can_date_with_disability?: string | null;
  relationship_perspective?: string | null;
}

/**
 * Calculate match percentage between current user and another user
 * @param currentUser - The current user's profile
 * @param otherUser - The other user's profile to compare against
 * @returns Match percentage (0-100)
 */
export function calculateMatchPercentage(
  currentUser: UserProfile,
  otherUser: UserProfile
): number {
  let totalPoints = 0;
  let maxPoints = 0;

  // 1. Relationship Goal Match (Weight: 20 points)
  maxPoints += 20;
  if (currentUser.relationship_goal && otherUser.relationship_goal) {
    if (currentUser.relationship_goal === otherUser.relationship_goal) {
      totalPoints += 20;
    } else {
      totalPoints += 5; // Partial match if both have goals but different
    }
  }

  // 2. Location Proximity (Weight: 15 points)
  maxPoints += 15;
  if (currentUser.county && otherUser.county) {
    if (currentUser.county === otherUser.county) {
      totalPoints += 15;
    } else if (currentUser.city && otherUser.city && currentUser.city === otherUser.city) {
      totalPoints += 10;
    }
  } else if (currentUser.can_relocate === 'Yes' || otherUser.can_relocate === 'Yes') {
    totalPoints += 8; // Bonus if willing to relocate
  }

  // 3. Religious Compatibility (Weight: 15 points)
  maxPoints += 15;
  if (currentUser.religion && otherUser.religion) {
    if (currentUser.religion === otherUser.religion) {
      totalPoints += 10;
      // Additional points for similar religiousness level
      if (currentUser.religiousness && otherUser.religiousness) {
        if (currentUser.religiousness === otherUser.religiousness) {
          totalPoints += 5;
        } else {
          totalPoints += 2;
        }
      }
    }
  }

  // 4. Marriage Beliefs (Weight: 10 points)
  maxPoints += 10;
  if (currentUser.believe_in_marriage && otherUser.believe_in_marriage) {
    if (currentUser.believe_in_marriage === otherUser.believe_in_marriage) {
      totalPoints += 10;
    }
  }

  // 5. Age Compatibility (Weight: 10 points)
  maxPoints += 10;
  if (currentUser.age && otherUser.age) {
    const ageDiff = Math.abs(currentUser.age - otherUser.age);
    if (ageDiff <= 3) {
      totalPoints += 10;
    } else if (ageDiff <= 5) {
      totalPoints += 7;
    } else if (ageDiff <= 10) {
      totalPoints += 4;
    } else {
      totalPoints += 1;
    }
  }

  // 6. Children Compatibility (Weight: 10 points)
  maxPoints += 10;
  const currentHasKids = (currentUser.number_of_children || 0) > 0;
  const otherHasKids = (otherUser.number_of_children || 0) > 0;
  
  if (currentHasKids && otherUser.open_to_dating_with_children === 'Yes') {
    totalPoints += 10;
  } else if (otherHasKids && currentUser.open_to_dating_with_children === 'Yes') {
    totalPoints += 10;
  } else if (!currentHasKids && !otherHasKids) {
    totalPoints += 10;
  } else if (currentUser.open_to_dating_with_children === 'Yes' && otherUser.open_to_dating_with_children === 'Yes') {
    totalPoints += 5;
  }

  // 7. Future Kids Compatibility (Weight: 8 points)
  maxPoints += 8;
  if (currentUser.want_kids && otherUser.want_kids) {
    if (currentUser.want_kids === otherUser.want_kids) {
      totalPoints += 8;
    }
  }

  // 8. Education Level (Weight: 7 points)
  maxPoints += 7;
  if (currentUser.education_level && otherUser.education_level) {
    const educationLevels = [
      'Primary education',
      'Secondary education',
      'Diploma or certificate',
      "Bachelor's degree",
      "Master's degree",
      'Doctorate (PhD)',
    ];
    const currentIndex = educationLevels.indexOf(currentUser.education_level);
    const otherIndex = educationLevels.indexOf(otherUser.education_level);
    
    if (currentIndex !== -1 && otherIndex !== -1) {
      const diff = Math.abs(currentIndex - otherIndex);
      if (diff === 0) {
        totalPoints += 7;
      } else if (diff === 1) {
        totalPoints += 5;
      } else if (diff === 2) {
        totalPoints += 3;
      }
    }
  }

  // 9. Lifestyle Compatibility (Weight: 5 points)
  maxPoints += 5;
  let lifestyleMatches = 0;
  let lifestyleChecks = 0;

  if (currentUser.smoking && otherUser.smoking) {
    lifestyleChecks++;
    if (currentUser.smoking === otherUser.smoking) {
      lifestyleMatches++;
    }
  }

  if (currentUser.alcohol_consumption && otherUser.alcohol_consumption) {
    lifestyleChecks++;
    if (currentUser.alcohol_consumption === otherUser.alcohol_consumption) {
      lifestyleMatches++;
    }
  }

  if (lifestyleChecks > 0) {
    totalPoints += (lifestyleMatches / lifestyleChecks) * 5;
  }

  // 10. Relationship Perspective (Weight: 5 points)
  maxPoints += 5;
  if (currentUser.relationship_perspective && otherUser.relationship_perspective) {
    if (currentUser.relationship_perspective === otherUser.relationship_perspective) {
      totalPoints += 5;
    } else if (
      currentUser.relationship_perspective === 'Shared roles / equal partnership' ||
      otherUser.relationship_perspective === 'Shared roles / equal partnership'
    ) {
      totalPoints += 2; // Partial match for flexible perspective
    }
  }

  // Calculate percentage
  const percentage = maxPoints > 0 ? Math.round((totalPoints / maxPoints) * 100) : 0;
  
  console.log('Match calculation:', {
    totalPoints,
    maxPoints,
    percentage,
  });

  return Math.min(100, Math.max(0, percentage));
}

/**
 * Get match color based on percentage
 * @param percentage - Match percentage
 * @returns Color code for the match badge
 */
export function getMatchColor(percentage: number): string {
  if (percentage >= 80) return '#4CAF50'; // Green - Excellent match
  if (percentage >= 60) return '#8BC34A'; // Light Green - Good match
  if (percentage >= 40) return '#FFC107'; // Amber - Fair match
  if (percentage >= 20) return '#FF9800'; // Orange - Low match
  return '#F44336'; // Red - Poor match
}

/**
 * Get match label based on percentage
 * @param percentage - Match percentage
 * @returns Label describing the match quality
 */
export function getMatchLabel(percentage: number): string {
  if (percentage >= 80) return 'Excellent Match';
  if (percentage >= 60) return 'Good Match';
  if (percentage >= 40) return 'Fair Match';
  if (percentage >= 20) return 'Low Match';
  return 'Poor Match';
}
