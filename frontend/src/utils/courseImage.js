export function getCourseImageUrl(course) {
  if (course && course.thumbnail_url) {
    return course.thumbnail_url;
  }
  // Fallback placeholder images based on some random or subject logic
  return 'https://images.unsplash.com/photo-1516321497487-e288fb19713f?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80';
}
