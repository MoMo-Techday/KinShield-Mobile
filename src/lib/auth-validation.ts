import { z } from "zod";

const emailWithLimit = z
  .string()
  .email("Vui lòng nhập địa chỉ email hợp lệ.")
  .max(254, "Email không được vượt quá 254 ký tự.");
const password = z
  .string()
  .min(15, "Mật khẩu phải có ít nhất 15 ký tự.")
  .max(128, "Mật khẩu không được vượt quá 128 ký tự.");
const existingPassword = z
  .string()
  .min(1, "Vui lòng nhập mật khẩu.")
  .max(1024, "Mật khẩu không được vượt quá 1024 ký tự.");

export const authSchemas = {
  login: z.object({
    email: emailWithLimit,
    password: existingPassword,
  }),
  register: z.object({
    email: emailWithLimit,
    displayName: z
      .string()
      .min(1, "Vui lòng nhập họ và tên.")
      .max(120, "Họ và tên không được vượt quá 120 ký tự."),
    password,
  }),
  verifyEmail: z.object({
    email: z.string().email("Vui lòng nhập địa chỉ email hợp lệ."),
    code: z.string().regex(/^\d{6}$/, "Mã xác minh phải gồm đúng 6 chữ số."),
  }),
  forgotPassword: z.object({
    email: emailWithLimit,
  }),
  resetPassword: z.object({
    token: z.string().length(43, "Mã đặt lại phải gồm đúng 43 ký tự."),
    password,
  }),
  changePassword: z.object({
    currentPassword: existingPassword,
    newPassword: password,
  }),
};

export type AuthFlow = keyof typeof authSchemas;

export type AuthFieldName =
  | "email"
  | "displayName"
  | "password"
  | "code"
  | "token"
  | "currentPassword"
  | "newPassword";

export type AuthFieldConfig = {
  name: AuthFieldName;
  label: string;
  placeholder: string;
  type: "email" | "text" | "password";
  autoComplete: "email" | "current-password" | "name" | "new-password" | "one-time-code" | "off";
  keyboardType?: "email-address" | "number-pad" | "default";
  maxLength?: number;
  action?: AuthLinkConfig;
};

export type AuthLinkConfig = {
  href:
    | "/auth"
    | "/auth/register"
    | "/auth/email/verify"
    | "/auth/password/forgot"
    | "/auth/password/reset"
    | "/auth/password/change";
  label: string;
};

export type AuthFormConfig = {
  title: string;
  description: string;
  submitLabel: string;
  fields: AuthFieldConfig[];
  links: AuthLinkConfig[];
};

export const authFormConfig: Record<AuthFlow, AuthFormConfig> = {
  login: {
    title: "Chào mừng trở lại",
    description: "Đăng nhập để tiếp tục bảo vệ gia đình cùng KinShield.",
    submitLabel: "Đăng nhập",
    fields: [
      {
        name: "email",
        label: "Email",
        placeholder: "ban@example.com",
        type: "email",
        autoComplete: "email",
        keyboardType: "email-address",
        maxLength: 254,
      },
      {
        name: "password",
        label: "Mật khẩu",
        placeholder: "Nhập mật khẩu",
        type: "password",
        autoComplete: "current-password",
        maxLength: 1024,
        action: { href: "/auth/password/forgot", label: "Quên mật khẩu?" },
      },
    ],
    links: [{ href: "/auth/register", label: "Tạo tài khoản" }],
  },
  register: {
    title: "Tạo tài khoản",
    description: "Bắt đầu thiết lập lớp bảo vệ cho gia đình bạn.",
    submitLabel: "Tạo tài khoản",
    fields: [
      {
        name: "email",
        label: "Email",
        placeholder: "ban@example.com",
        type: "email",
        autoComplete: "email",
        keyboardType: "email-address",
        maxLength: 254,
      },
      {
        name: "displayName",
        label: "Họ và tên",
        placeholder: "Nguyễn Văn An",
        type: "text",
        autoComplete: "name",
        maxLength: 120,
      },
      {
        name: "password",
        label: "Mật khẩu",
        placeholder: "Ít nhất 15 ký tự",
        type: "password",
        autoComplete: "new-password",
        maxLength: 128,
      },
    ],
    links: [],
  },
  verifyEmail: {
    title: "Xác minh email",
    description: "Nhập mã xác minh gồm 6 chữ số đã gửi đến email của bạn.",
    submitLabel: "Xác minh email",
    fields: [
      {
        name: "code",
        label: "Mã xác minh",
        placeholder: "000000",
        type: "text",
        autoComplete: "one-time-code",
        keyboardType: "number-pad",
        maxLength: 6,
      },
    ],
    links: [],
  },
  forgotPassword: {
    title: "Quên mật khẩu",
    description: "Nhập email để tiếp tục quy trình đặt lại mật khẩu.",
    submitLabel: "Tiếp tục",
    fields: [
      {
        name: "email",
        label: "Email",
        placeholder: "ban@example.com",
        type: "email",
        autoComplete: "email",
        keyboardType: "email-address",
        maxLength: 254,
      },
    ],
    links: [],
  },
  resetPassword: {
    title: "Đặt lại mật khẩu",
    description: "Nhập mã đặt lại gồm 43 ký tự và mật khẩu mới.",
    submitLabel: "Đặt lại mật khẩu",
    fields: [
      {
        name: "token",
        label: "Mã đặt lại",
        placeholder: "Dán mã từ liên kết đặt lại",
        type: "text",
        autoComplete: "off",
        keyboardType: "default",
        maxLength: 43,
      },
      {
        name: "password",
        label: "Mật khẩu mới",
        placeholder: "Ít nhất 15 ký tự",
        type: "password",
        autoComplete: "new-password",
        maxLength: 128,
      },
    ],
    links: [],
  },
  changePassword: {
    title: "Đổi mật khẩu",
    description: "Nhập mật khẩu hiện tại và mật khẩu mới cho tài khoản.",
    submitLabel: "Cập nhật mật khẩu",
    fields: [
      {
        name: "currentPassword",
        label: "Mật khẩu hiện tại",
        placeholder: "Nhập mật khẩu hiện tại",
        type: "password",
        autoComplete: "current-password",
        maxLength: 1024,
      },
      {
        name: "newPassword",
        label: "Mật khẩu mới",
        placeholder: "Ít nhất 15 ký tự",
        type: "password",
        autoComplete: "new-password",
        maxLength: 128,
      },
    ],
    links: [{ href: "/auth", label: "Quay lại đăng nhập" }],
  },
};
