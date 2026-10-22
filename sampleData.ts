export type Role = 'student' | 'teacher' | 'centre' | 'admin';
export type Question = {
  id: string; board: string; medium: 'English' | 'বাংলা'; grade: number; subject: string;
  prompt: string; options: string[]; answerIndex: number; explanation: string; marks: number;
};
export const boards = ['CBSE', 'CISCE / ICSE', 'West Bengal Board'];
export const subjects = ['English', 'বাংলা', 'Mathematics', 'EVS', 'Science', 'Social Science', 'Hindi', 'Computer Studies', 'Reasoning', 'Abacus'];
export const sampleQuestions: Question[] = [
  {id:'q1',board:'CBSE',medium:'English',grade:1,subject:'Mathematics',prompt:'What is 7 + 5?',options:['10','11','12','13'],answerIndex:2,explanation:'7 + 5 = 12.',marks:1},
  {id:'q2',board:'CBSE',medium:'English',grade:1,subject:'English',prompt:'Choose the plural of “book”.',options:['bookes','books','bookies','book'],answerIndex:1,explanation:'Most nouns form the plural by adding -s.',marks:1},
  {id:'q3',board:'West Bengal Board',medium:'বাংলা',grade:2,subject:'গণিত',prompt:'৮ + ৬ = কত?',options:['১২','১৩','১৪','১৫'],answerIndex:2,explanation:'৮-এর সঙ্গে ৬ যোগ করলে ১৪ হয়।',marks:1},
  {id:'q4',board:'CISCE / ICSE',medium:'English',grade:3,subject:'Reasoning',prompt:'Which number comes next: 2, 4, 6, 8, …?',options:['9','10','11','12'],answerIndex:1,explanation:'The sequence increases by 2.',marks:1},
  {id:'q5',board:'CBSE',medium:'English',grade:4,subject:'Science',prompt:'Which part of a plant usually absorbs water?',options:['Flower','Leaf','Root','Fruit'],answerIndex:2,explanation:'Roots absorb water and minerals from soil.',marks:1},
  {id:'q6',board:'West Bengal Board',medium:'বাংলা',grade:3,subject:'Abacus',prompt:'অ্যাবাকাসে ৭ + ২ = কত?',options:['৮','৯','১০','১১'],answerIndex:1,explanation:'৭ + ২ = ৯।',marks:1},
  {id:'q7',board:'CBSE',medium:'English',grade:5,subject:'Mathematics',prompt:'What is 3/4 of 20?',options:['5','10','15','16'],answerIndex:2,explanation:'20 ÷ 4 × 3 = 15.',marks:1},
  {id:'q8',board:'CISCE / ICSE',medium:'English',grade:6,subject:'Social Science',prompt:'Which is a primary source for studying a historical event?',options:['A diary written at the time','A modern textbook summary','A fictional story','An advertisement about a new film'],answerIndex:0,explanation:'A contemporaneous diary is a primary source.',marks:1}
];
export const demoAccounts = [
  {id:'AIF-STU-0001',password:'student123',role:'student' as Role,name:'Demo Student',scope:'Class 1 · CBSE · English'},
  {id:'AIF-TCH-0001',password:'teacher123',role:'teacher' as Role,name:'Demo Teacher',scope:'Class 1 · CBSE · English · Mathematics'},
  {id:'AIF-CEN-0001',password:'centre123',role:'centre' as Role,name:'Demo Centre Head',scope:'Demo Centre'},
  {id:'AIF-ADM-0001',password:'admin123',role:'admin' as Role,name:'Demo Super Admin',scope:'All centres (demo only)'}
];