import {
    Entity,
    Property,
    PropertyTypes,
    Relation,
    Interaction,
    Action,
    Payload,
    PayloadItem,
    Attributive,
    BoolExp,
    boolExpToAttributives,
    createUserRoleAttributive,
    MapInteraction,
    MapInteractionItem,
    RelationBasedAny,
    RelationBasedEvery,
    RelationCount,
    Controller
} from "@interaqt/runtime";


const UserEntity = Entity.create({
    name: 'User',
    properties: [
        Property.create({name: 'name', type: PropertyTypes.String}),
        Property.create({name: 'roles', type: PropertyTypes.String, collection: true})
    ],
})
// 实体和属性定义
// 学生实体
const studentNameProp = Property.create({ name: 'name', type: PropertyTypes.String });
const studentClassProp = Property.create({ name: 'class', type: PropertyTypes.String });
const StudentEntity = Entity.create({
    name: 'Student',
    properties: [
        studentNameProp,
        studentClassProp
    ]
});

// 成绩实体
const gradeSubjectProp = Property.create({ name: 'subject', type: PropertyTypes.String });
const gradeScoreProp = Property.create({ name: 'score', type: PropertyTypes.Number });
const GradeEntity = Entity.create({
    name: 'Grade',
    properties: [
        gradeSubjectProp,
        gradeScoreProp
    ]
});

// 宿舍实体
const dormitoryNumberProp = Property.create({ name: 'number', type: PropertyTypes.String });
const dormitoryCapacityProp = Property.create({ name: 'capacity', type: PropertyTypes.Number });
const DormitoryEntity = Entity.create({
    name: 'Dormitory',
    properties: [
        dormitoryNumberProp,
        dormitoryCapacityProp
    ]
});

// 打卡记录实体
const attendanceTimeProp = Property.create({ name: 'time', type: PropertyTypes.String });
const attendanceLocationProp = Property.create({ name: 'location', type: PropertyTypes.String });
const AttendanceRecordEntity = Entity.create({
    name: 'AttendanceRecord',
    properties: [
        attendanceTimeProp,
        attendanceLocationProp
    ]
});

// 关系定义
const gradeStudentRelation = Relation.create({
    source: GradeEntity,
    sourceProperty: 'grade',
    target: StudentEntity,
    targetProperty: 'student',
    relType: 'n:1'
});

const dormitoryStudentRelation = Relation.create({
    source: DormitoryEntity,
    sourceProperty: 'dormitory',
    target: StudentEntity,
    targetProperty: 'student',
    relType: '1:n'
});

const attendanceStudentRelation = Relation.create({
    source: AttendanceRecordEntity,
    sourceProperty: 'attendance',
    target: StudentEntity,
    targetProperty: 'student',
    relType: 'n:1'
});

// 角色定语
const teacherRole = createUserRoleAttributive({ name: 'teacher' });
const adminRole = createUserRoleAttributive({ name: 'admin' });
const studentRole = createUserRoleAttributive({ name: 'student' });

// 交互动作定义
// 成绩登记
const recordGradeAction = Action.create({ name: 'recordGrade' });
const recordGradePayload = Payload.create({
    items: [
        PayloadItem.create({
            name: 'grade',
            base: GradeEntity
        }),
        PayloadItem.create({
            name: 'student',
            base: StudentEntity,
            isRef: true
        })
    ]
});
const recordGradeInteraction = Interaction.create({
    userAttributives: teacherRole,
    name: 'recordGrade',
    action: recordGradeAction,
    payload: recordGradePayload
});

// 宿舍分配
const assignDormitoryAction = Action.create({ name: 'assignDormitory' });
const assignDormitoryPayload = Payload.create({
    items: [
        PayloadItem.create({
            name: 'dormitory',
            base: DormitoryEntity,
            isRef: true
        }),
        PayloadItem.create({
            name: 'student',
            base: StudentEntity,
            isRef: true
        })
    ]
});
const assignDormitoryInteraction = Interaction.create({
    userAttributives: adminRole,
    name: 'assignDormitory',
    action: assignDormitoryAction,
    payload: assignDormitoryPayload
});

// 学生打卡
const studentAttendanceAction = Action.create({ name: 'studentAttendance' });
const studentAttendancePayload = Payload.create({
    items: [
        PayloadItem.create({
            name: 'attendanceRecord',
            base: AttendanceRecordEntity
        }),
        PayloadItem.create({
            name: 'student',
            base: StudentEntity,
            isRef: true
        })
    ]
});
const studentAttendanceInteraction = Interaction.create({
    userAttributives: studentRole,
    name: 'studentAttendance',
    action: studentAttendanceAction,
    payload: studentAttendancePayload
});

// 计算数据类型定义
// 使用 MapInteraction 映射交互数据到实体或关系
gradeStudentRelation.computedData = MapInteraction.create({
    items: [
        MapInteractionItem.create({
            interaction: recordGradeInteraction,
            map: function map(event: any) {
                return {
                    source: event.payload.grade,
                    target: event.payload.student
                }
            }
        })
    ]
});

dormitoryStudentRelation.computedData = MapInteraction.create({
    items: [
        MapInteractionItem.create({
            interaction: assignDormitoryInteraction,
            map: function map(event: any) {
                return {
                    source: event.payload.dormitory,
                    target: event.payload.student
                }
            }
        })
    ]
});

attendanceStudentRelation.computedData = MapInteraction.create({
    items: [
        MapInteractionItem.create({
            interaction: studentAttendanceInteraction,
            map: function map(event: any) {
                return {
                    source: event.payload.attendanceRecord,
                    target: event.payload.student
                }
            }
        })
    ]
});

// 导出所有定义的实体、关系、交互等
export const entities = [UserEntity, StudentEntity, GradeEntity, DormitoryEntity, AttendanceRecordEntity];
export const relations = [gradeStudentRelation, dormitoryStudentRelation, attendanceStudentRelation];
export const interactions = [recordGradeInteraction, assignDormitoryInteraction, studentAttendanceInteraction];
export const states = []; // 如有全局状态定义，添加到此数组中
export const activities = []; // 如有活动定义，添加到此数组中
