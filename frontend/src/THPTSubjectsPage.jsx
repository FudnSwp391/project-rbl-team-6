/**
 * THPTSubjectsPage — wrapper mỏng quanh SubjectsLevelPage với data cấp THPT.
 * (Trước đây là ~730 dòng copy của 2 trang cấp còn lại.)
 */
import SubjectsLevelPage from './SubjectsLevelPage';
import { THPT_LEVEL } from './constants/subjectLevels';

export default function THPTSubjectsPage(props) {
  return <SubjectsLevelPage config={THPT_LEVEL} {...props} />;
}
