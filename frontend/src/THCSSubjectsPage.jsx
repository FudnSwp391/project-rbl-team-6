/**
 * THCSSubjectsPage — wrapper mỏng quanh SubjectsLevelPage với data cấp THCS.
 * (Trước đây là ~760 dòng copy của 2 trang cấp còn lại.)
 */
import SubjectsLevelPage from './SubjectsLevelPage';
import { THCS_LEVEL } from './constants/subjectLevels';

export default function THCSSubjectsPage(props) {
  return <SubjectsLevelPage config={THCS_LEVEL} {...props} />;
}
