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
    MapInteraction,
    MapInteractionItem,
    Computation,
    Controller
} from "@interaqt/runtime";

// 定义属性
const nameProp = Property.create({name: 'name', type: PropertyTypes.String});
const roleProp = Property.create({name: 'role', type: PropertyTypes.String});

// 定义用户实体（员工）
const UserEntity = Entity.create({
    name: 'User',
    properties: [nameProp, roleProp],
});

// 定义打卡记录实体
const AttendanceRecordEntity = Entity.create({
    name: 'AttendanceRecord',
    properties: [
        Property.create({name: 'timestamp', type: PropertyTypes.String}),
        Property.create({name: 'type', type: PropertyTypes.String}), // 上班或下班
        // 其他打卡相关属性
    ],
});

// 定义请假记录实体
const LeaveRequestEntity = Entity.create({
    name: 'LeaveRequest',
    properties: [
        Property.create({name: 'startDate', type: PropertyTypes.String}),
        Property.create({name: 'endDate', type: PropertyTypes.String}),
        Property.create({name: 'reason', type: PropertyTypes.String}),
        Property.create({name: 'status', type: PropertyTypes.String}), // 例如：待审批、已批准、已拒绝
        // 其他请假相关属性
    ],
});

// 定义关系
// 员工与打卡记录关系
const userAttendanceRelation = Relation.create({
    source: UserEntity,
    sourceProperty: 'user',
    target: AttendanceRecordEntity,
    targetProperty: 'attendanceRecord',
    relType: '1:n',
});

// 员工与请假记录关系
const userLeaveRequestRelation = Relation.create({
    source: UserEntity,
    sourceProperty: 'user',
    target: LeaveRequestEntity,
    targetProperty: 'leaveRequest',
    relType: '1:n',
});

// 定义交互动作
// 员工打卡
const checkInInteraction = Interaction.create({
    name: 'checkIn',
    action: Action.create({name: 'checkIn'}),
    payload: Payload.create({
        items: [
            PayloadItem.create({
                name: 'attendanceRecord',
                base: AttendanceRecordEntity,
            }),
            PayloadItem.create({
                name: 'user',
                base: UserEntity,
                isRef: true,
            }),
        ]
    })
});

// 提交请假请求
const submitLeaveRequestInteraction = Interaction.create({
    name: 'submitLeaveRequest',
    action: Action.create({name: 'submitLeaveRequest'}),
    payload: Payload.create({
        items: [
            PayloadItem.create({
                name: 'leaveRequest',
                base: LeaveRequestEntity,
            }),
            PayloadItem.create({
                name: 'user',
                base: UserEntity,
                isRef: true,
            }),
        ]
    })
});

// 审批请假
const approveLeaveRequestInteraction = Interaction.create({
    name: 'approveLeaveRequest',
    action: Action.create({name: 'approveLeaveRequest'}),
    payload: Payload.create({
        items: [
            PayloadItem.create({
                name: 'leaveRequest',
                base: LeaveRequestEntity,
                isRef: true,
                attributives: boolExpToAttributives(BoolExp.atom(Attributive.create({
                    name: 'Pending',
                    content: function (this: Controller, leaveRequest, {user}) {
                        return leaveRequest.status === 'pending';
                    }
                }))),
            }),
        ]
    })
});

// 补充 computedData

// 打卡记录实体的 computedData
AttendanceRecordEntity.computedData = MapInteraction.create({
    items: [
        MapInteractionItem.create({
            interaction: checkInInteraction,
            map: function map(event: any) {
                return {
                    timestamp: event.payload.attendanceRecord.timestamp,
                    type: event.payload.attendanceRecord.type,
                    user: event.payload.user,
                }
            }
        }),
    ]
});

// 请假记录实体的 computedData
LeaveRequestEntity.computedData = MapInteraction.create({
    items: [
        MapInteractionItem.create({
            interaction: submitLeaveRequestInteraction,
            map: function map(event: any) {
                return {
                    startDate: event.payload.leaveRequest.startDate,
                    endDate: event.payload.leaveRequest.endDate,
                    reason: event.payload.leaveRequest.reason,
                    status: 'pending', // 初始状态为待审批
                    user: event.payload.user,
                }
            }
        }),
        MapInteractionItem.create({
            interaction: approveLeaveRequestInteraction,
            map: function map(event: any) {
                return {
                    status: 'approved', // 审批后状态为已批准
                }
            }
        }),
    ]
});

// 导出
export const entities = [UserEntity, AttendanceRecordEntity, LeaveRequestEntity];
export const relations = [userAttendanceRelation, userLeaveRequestRelation];
export const interactions = [checkInInteraction, submitLeaveRequestInteraction, approveLeaveRequestInteraction];
export const states = [];
export const activities = [];
