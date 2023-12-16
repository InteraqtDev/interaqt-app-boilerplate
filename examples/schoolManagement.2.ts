import {
    Entity,
    Property,
    PropertyTypes,
    Relation,
    Interaction,
    Action,
    Payload,
    PayloadItem,
    BoolExp,
    Attributive,
    boolExpToAttributives,
    GetAction,
    DataAttributive,
    boolExpToDataAttributives,
    RelationBasedEvery,
    RelationBasedAny,
    RelationCount,
    Computation,
    Controller,
    MapInteraction,
    MapInteractionItem
} from "@interaqt/runtime";

// 定义属性
const nameProp = Property.create({name: 'name', type: PropertyTypes.String});
const roleProp = Property.create({name: 'role', type: PropertyTypes.String});

// 定义用户实体
const UserEntity = Entity.create({
    name: 'User',
    properties: [nameProp, roleProp],
});

// 定义科目实体
const SubjectEntity = Entity.create({
    name: 'Subject',
    properties: [Property.create({name: 'subjectName', type: PropertyTypes.String})],
});

// 定义成绩实体
const GradeEntity = Entity.create({
    name: 'Grade',
    properties: [
        Property.create({name: 'score', type: PropertyTypes.Number}),
        // 其他成绩相关属性
    ],
});

// 定义宿舍实体
const DormitoryEntity = Entity.create({
    name: 'Dormitory',
    properties: [
        Property.create({name: 'dormNumber', type: PropertyTypes.String}),
        // 其他宿舍相关属性
    ],
});

// 定义打卡记录实体
const AttendanceRecordEntity = Entity.create({
    name: 'AttendanceRecord',
    properties: [
        Property.create({name: 'timestamp', type: PropertyTypes.String}),
        // 其他打卡相关属性
    ],
});

// 定义关系
// 学生与成绩关系
const studentGradeRelation = Relation.create({
    source: GradeEntity,
    sourceProperty: 'grade',
    target: UserEntity,
    targetProperty: 'student',
    relType: 'n:1',
});

// 学生与科目关系
const subjectGradeRelation = Relation.create({
    source: GradeEntity,
    sourceProperty: 'grade',
    target: SubjectEntity,
    targetProperty: 'subject',
    relType: 'n:1',
});

// 学生与宿舍关系
const studentDormitoryRelation = Relation.create({
    source: UserEntity,
    sourceProperty: 'student',
    target: DormitoryEntity,
    targetProperty: 'dormitory',
    relType: '1:1',
});

// 学生与打卡记录关系
const studentAttendanceRelation = Relation.create({
    source: UserEntity,
    sourceProperty: 'student',
    target: AttendanceRecordEntity,
    targetProperty: 'attendanceRecord',
    relType: '1:n',
});

// 定义交互动作
// 教师登记成绩
const recordGradeInteraction = Interaction.create({
    name: 'recordGrade',
    action: Action.create({name: 'recordGrade'}),
    payload: Payload.create({
        items: [
            PayloadItem.create({
                name: 'grade',
                base: GradeEntity,
            }),
            PayloadItem.create({
                name: 'student',
                base: UserEntity,
                isRef: true,
            }),
            PayloadItem.create({
                name: 'subject',
                base: SubjectEntity,
                isRef: true,
            }),
        ]
    })
});

// 管理员分配宿舍
const assignDormitoryInteraction = Interaction.create({
    name: 'assignDormitory',
    action: Action.create({name: 'assignDormitory'}),
    payload: Payload.create({
        items: [
            PayloadItem.create({
                name: 'student',
                base: UserEntity,
                isRef: true,
            }),
            PayloadItem.create({
                name: 'dormitory',
                base: DormitoryEntity,
                isRef: true,
            }),
        ]
    })
});

// 学生打卡
const studentCheckInInteraction = Interaction.create({
    name: 'studentCheckIn',
    action: Action.create({name: 'studentCheckIn'}),
    payload: Payload.create({
        items: [
            PayloadItem.create({
                name: 'student',
                base: UserEntity,
                isRef: true,
            }),
            PayloadItem.create({
                name: 'attendanceRecord',
                base: AttendanceRecordEntity,
            }),
        ]
    })
});

// 查看成绩
const viewGradesInteraction = Interaction.create({
    name: 'viewGrades',
    action: GetAction,
    dataAttributives: boolExpToDataAttributives(BoolExp.atom(Attributive.create({
        name: 'StudentGrade',
        content: function (this: Controller, grade, { user }) {
            return grade.studentId === user.id;
        }
    }))),
    data: GradeEntity,
});

// 查看宿舍信息
const viewDormitoryInfoInteraction = Interaction.create({
    name: 'viewDormitoryInfo',
    action: GetAction,
    dataAttributives: boolExpToDataAttributives(BoolExp.atom(Attributive.create({
        name: 'StudentDormitory',
        content: function (this: Controller, dormitory, { user }) {
            return dormitory.studentId === user.id;
        }
    }))),
    data: DormitoryEntity,
});

// 查看打卡记录
const viewAttendanceRecordsInteraction = Interaction.create({
    name: 'viewAttendanceRecords',
    action: GetAction,
    dataAttributives: boolExpToDataAttributives(BoolExp.atom(Attributive.create({
        name: 'StudentAttendance',
        content: function (this: Controller, attendanceRecord, { user }) {
            return attendanceRecord.studentId === user.id;
        }
    }))),
    data: AttendanceRecordEntity,
});



// 宿舍实体的 computedData
DormitoryEntity.computedData = MapInteraction.create({
    items: [
        MapInteractionItem.create({
            interaction: assignDormitoryInteraction,
            map: function map(event: any) {
                return {
                    dormNumber: event.payload.dormitory.dormNumber,
                    student: event.payload.dormitory.student,
                }
            }
        }),
    ]
});

// 打卡记录实体的 computedData
AttendanceRecordEntity.computedData = MapInteraction.create({
    items: [
        MapInteractionItem.create({
            interaction: studentCheckInInteraction,
            map: function map(event: any) {
                return {
                    timestamp: event.payload.attendanceRecord.timestamp,
                    student: event.payload.attendanceRecord.student,
                }
            }
        }),
    ]
});

// 学生与成绩关系的 computedData
studentGradeRelation.computedData = MapInteraction.create({
    items: [
        MapInteractionItem.create({
            interaction: recordGradeInteraction,
            map: function map(event: any) {
                return {
                    source: event.payload.grade,
                    target: event.payload.student,
                }
            }
        }),
    ]
});

// 学生与宿舍关系的 computedData
studentDormitoryRelation.computedData = MapInteraction.create({
    items: [
        MapInteractionItem.create({
            interaction: assignDormitoryInteraction,
            map: function map(event: any) {
                return {
                    source: event.payload.student,
                    target: event.payload.dormitory,
                }
            }
        }),
    ]
});

// 学生与打卡记录关系的 computedData
studentAttendanceRelation.computedData = MapInteraction.create({
    items: [
        MapInteractionItem.create({
            interaction: studentCheckInInteraction,
            map: function map(event: any) {
                return {
                    source: event.payload.student,
                    target: event.payload.attendanceRecord,
                }
            }
        }),
    ]
});

// 导出
export const entities = [UserEntity, SubjectEntity, GradeEntity, DormitoryEntity, AttendanceRecordEntity];
export const relations = [studentGradeRelation, subjectGradeRelation, studentDormitoryRelation, studentAttendanceRelation];
export const interactions = [recordGradeInteraction, assignDormitoryInteraction, studentCheckInInteraction, viewGradesInteraction, viewDormitoryInfoInteraction, viewAttendanceRecordsInteraction];
export const states = [];
export const activities = [];

