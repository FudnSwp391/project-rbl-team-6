/**
 * Models Index
 * Export tất cả models của Person 4 (Course Detail)
 *
 * Usage:
 *   const { Course, Lesson, Assignment, Material, CourseProgress } = require("./models");
 */
const Course         = require("./Course");
const Lesson         = require("./Lesson");
const Assignment     = require("./Assignment");
const Material       = require("./Material");
const CourseProgress = require("./CourseProgress");

module.exports = {
  Course,
  Lesson,
  Assignment,
  Material,
  CourseProgress,
};
