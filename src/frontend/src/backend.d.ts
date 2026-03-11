import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export interface PeriodInput {
    date: string;
    summaryPrimary: string;
    summarySecondary: string;
    periodNumber: bigint;
    courseId: bigint;
}
export type Time = bigint;
export interface CourseRecord {
    id: bigint;
    name: string;
    createdAt: Time;
    year: string;
}
export interface UserProfile {
    name: string;
}
export interface PeriodRecord {
    id: bigint;
    date: string;
    createdAt: Time;
    summaryPrimary: string;
    summarySecondary: string;
    periodNumber: bigint;
    courseId: bigint;
}
export enum UserRole {
    admin = "admin",
    user = "user",
    guest = "guest"
}
export interface backendInterface {
    addPeriod(input: PeriodInput): Promise<void>;
    assignCallerUserRole(user: Principal, role: UserRole): Promise<void>;
    deleteCourse(courseId: bigint): Promise<void>;
    getAllCourses(): Promise<Array<CourseRecord>>;
    getCallerUserProfile(): Promise<UserProfile | null>;
    getCallerUserRole(): Promise<UserRole>;
    getCourse(courseId: bigint): Promise<CourseRecord | null>;
    getPeriodsForDate(courseId: bigint, date: string): Promise<Array<PeriodRecord>>;
    getUserProfile(user: Principal): Promise<UserProfile | null>;
    isCallerAdmin(): Promise<boolean>;
    registerCourse(name: string, year: string): Promise<bigint>;
    saveCallerUserProfile(profile: UserProfile): Promise<void>;
}
