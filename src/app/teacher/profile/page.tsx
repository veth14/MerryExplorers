"use client";

import { useEffect, useState } from "react";
import { TeacherShell } from "@/components/teacher/teacher-shell";
import { useAuth } from "@/lib/auth-context";
import { auth } from "@/lib/firebase";
import { sendPasswordResetEmail, updatePassword, EmailAuthProvider, reauthenticateWithCredential } from "firebase/auth";
import { Modal } from "@/components/ui/modal";

const initialTeacherData = {
  personalInfo: {
    fullName: "Iya Abeleda",
    dateOfBirth: "May 1, 2002",
    email: "iya.a@merryexplorers.edu",
    phone: "(555) 123-4567",
    homeAddress: "123 Maple Street, Apt 4B, Springfield, IL 62704",
  },
  workDetails: {
    role: "Lead Teacher",
    assignedRoom: "Sunshine Room (Toddlers)",
    employeeId: "ME-2021-042",
    scheduleType: "Full-Time (M-F)",
  },
  profileCard: {
    firstName: "Iya",
    lastName: "Abeleda",
    title: "Lead Teacher - Toddlers",
    tags: ["Early Childhood Ed", "CPR Certified"],
    joined: "Aug 2026",
    status: "Active",
    avatarUrl: "",
    avatarColor: "#ffb800",
    initials: "IA",
  },
  emergencyContacts: [
    {
      name: "David Jenkins",
      relationship: "Spouse",
      phone: "(555) 987-6543",
    },
    {
      name: "Martha Jenkins",
      relationship: "Mother",
      phone: "(555) 456-7890",
    },
  ],
};

export default function TeacherProfilePage() {
  const { user, userProfile } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState(initialTeacherData);
  const [saving, setSaving] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [errorModal, setErrorModal] = useState<string | null>(null);
  const [successModal, setSuccessModal] = useState<string | null>(null);

  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  useEffect(() => {
    if (userProfile) {
      setFormData({
        personalInfo: {
          fullName: userProfile.fullName || "",
          dateOfBirth: userProfile.dateOfBirth || "",
          email: userProfile.email || "",
          phone: userProfile.phone || "",
          homeAddress: userProfile.homeAddress || "",
        },
        workDetails: {
          role: userProfile.role || "",
          assignedRoom: userProfile.assignedRoom || "",
          employeeId: userProfile.employeeId || "",
          scheduleType: userProfile.scheduleType || "",
        },
        profileCard: {
          firstName: userProfile.fullName?.split(" ")[0] || "",
          lastName: userProfile.fullName?.split(" ").slice(1).join(" ") || "",
          title: `${userProfile.role} - ${userProfile.assignedRoom}`,
          tags: userProfile.tags || [],
          joined: userProfile.joinDate || "",
          status: userProfile.status || "Active",
          avatarUrl: userProfile.avatarUrl || "",
          avatarColor: userProfile.avatarColor || "#ffb800",
          initials: userProfile.initials || "T",
        },
        emergencyContacts: userProfile.emergencyContacts || [],
      });
    }
  }, [userProfile]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const payload = {
        fullName: formData.personalInfo.fullName,
        dateOfBirth: formData.personalInfo.dateOfBirth,
        email: formData.personalInfo.email,
        phone: formData.personalInfo.phone,
        homeAddress: formData.personalInfo.homeAddress,
        emergencyContacts: formData.emergencyContacts,
      };

      const res = await fetch(`/api/accounts/${user.uid}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setIsEditing(false);
        // Force a page reload to refresh the context data globally
        window.location.reload();
      } else {
        setErrorModal("Failed to save changes. Please try again.");
      }
    } catch (e) {
      console.error(e);
      setErrorModal("An error occurred while saving your profile.");
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (userProfile) {
      setFormData({
        personalInfo: {
          fullName: userProfile.fullName || "",
          dateOfBirth: userProfile.dateOfBirth || "",
          email: userProfile.email || "",
          phone: userProfile.phone || "",
          homeAddress: userProfile.homeAddress || "",
        },
        workDetails: {
          role: userProfile.role || "",
          assignedRoom: userProfile.assignedRoom || "",
          employeeId: userProfile.employeeId || "",
          scheduleType: userProfile.scheduleType || "",
        },
        profileCard: {
          firstName: userProfile.fullName?.split(" ")[0] || "",
          lastName: userProfile.fullName?.split(" ").slice(1).join(" ") || "",
          title: `${userProfile.role} - ${userProfile.assignedRoom}`,
          tags: userProfile.tags || [],
          joined: userProfile.joinDate || "",
          status: userProfile.status || "Active",
          avatarUrl: userProfile.avatarUrl || "",
          avatarColor: userProfile.avatarColor || "#ffb800",
          initials: userProfile.initials || "T",
        },
        emergencyContacts: userProfile.emergencyContacts || [],
      });
    }
    setIsEditing(false);
  };

  const handleResetPassword = async () => {
    // Open the new password change modal instead of sending email
    setIsPasswordModalOpen(true);
    setPasswordError(null);
    setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
  };

  const handleChangePasswordSubmit = async () => {
    if (!user?.email) return;
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError("New passwords do not match.");
      return;
    }
    if (passwordForm.newPassword.length < 6) {
      setPasswordError("Password must be at least 6 characters.");
      return;
    }

    setIsChangingPassword(true);
    setPasswordError(null);

    try {
      // Re-authenticate
      const credential = EmailAuthProvider.credential(user.email, passwordForm.currentPassword);
      await reauthenticateWithCredential(user, credential);

      // Update password
      await updatePassword(user, passwordForm.newPassword);
      
      setIsPasswordModalOpen(false);
      setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
      setSuccessModal("Password changed successfully.");
    } catch (e: any) {
      console.error(e);
      setPasswordError(e.message || "Failed to change password. Please check your current password.");
    } finally {
      setIsChangingPassword(false);
    }
  };

  return (
    <>
      <TeacherShell title="Teacher Profile">
        <div className="gap-8 w-full">
          {/* ── Top Row: Profile Card + Personal Info ── */}
          <div className="flex flex-col md:flex-row gap-8 items-stretch w-full mb-6">
            {/* Left Column: Profile Card */}
            <div className="w-full md:w-1/3 flex">
              <div className="bg-white rounded-[2rem] shadow-lg border-2 border-brand-yellow overflow-hidden flex flex-col items-center pt-10 pb-8 px-6 relative w-full">
                {/* Decorative top banner */}
                <div className="absolute top-0 left-0 w-full h-24 bg-brand-sky/50" />

                {/* Avatar */}
                <div
                  className="w-32 h-32 rounded-full border-4 border-white bg-surface-container-low shadow-md overflow-hidden relative z-10 mb-6 flex items-center justify-center text-white text-5xl font-black"
                  style={{ backgroundColor: formData.profileCard.avatarColor }}
                >
                  {formData.profileCard.avatarUrl ? (
                    <img
                      alt="Teacher Profile Picture"
                      className="w-full h-full object-cover"
                      src={formData.profileCard.avatarUrl}
                    />
                  ) : (
                    formData.profileCard.initials
                  )}
                </div>

                {/* Name & Title */}
                <h2 className="text-2xl font-black text-brand-navy text-center mb-1">
                  {formData.personalInfo.fullName}
                </h2>
                <p className="font-bold text-brand-blue text-sm text-center mb-4">
                  {formData.profileCard.title}
                </p>

                {/* Tags */}
                <div className="flex flex-wrap justify-center gap-2 mb-8">
                  {formData.profileCard.tags.map((tag) => (
                    <span
                      key={tag}
                      className={`font-black text-[10px] px-3 py-1 rounded-full uppercase tracking-wider ${tag === "CPR Certified"
                        ? "bg-brand-sky text-brand-blue"
                        : "bg-brand-orange text-brand-navy"
                        }`}
                    >
                      {tag}
                    </span>
                  ))}
                </div>

                {/* Joined & Status */}
                <div className="w-full border-t border-brand-sky mt-auto pt-6 flex justify-around">
                  <div className="text-center">
                    <p className="font-bold text-[10px] text-brand-blue uppercase tracking-wider mb-1">
                      Joined
                    </p>
                    <p className="text-sm text-brand-navy font-bold">
                      {formData.profileCard.joined}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="font-bold text-[10px] text-brand-blue uppercase tracking-wider mb-1">
                      Status
                    </p>
                    <p className="text-sm text-brand-orange font-bold">
                      {formData.profileCard.status}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Personal Information */}
            <div className="w-full md:w-2/3 flex">
              <section className="bg-white rounded-[2rem] border-2 border-brand-orange shadow-lg p-6 relative overflow-hidden w-full flex flex-col">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-2xl font-black text-brand-navy flex items-center gap-2">
                    <svg className="text-brand-orange w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z" />
                    </svg>
                    Personal Information
                  </h3>
                  {!isEditing ? (
                    <button
                      onClick={() => setIsEditing(true)}
                      className="px-4 py-2 rounded-full bg-brand-orange text-brand-navy font-bold text-sm hover:brightness-95 transition-all shadow-sm"
                    >
                      Edit Info
                    </button>
                  ) : (
                    <div className="flex gap-2">
                      <button
                        onClick={handleCancel}
                        disabled={saving}
                        className="px-4 py-2 rounded-full bg-gray-100 text-gray-600 font-bold text-sm hover:bg-gray-200 transition-colors disabled:opacity-50"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleSave}
                        disabled={saving}
                        className="px-4 py-2 rounded-full bg-brand-blue text-white font-bold text-sm hover:brightness-110 transition-all shadow-sm disabled:opacity-50 flex items-center gap-2"
                      >
                        {saving && (
                          <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        )}
                        Save Changes
                      </button>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-5 flex-1">
                  {/* Full Name */}
                  <div className="flex flex-col gap-1">
                    <label className="font-bold text-[10px] text-brand-orange uppercase tracking-wider ml-1">
                      Full Name
                    </label>
                    {isEditing ? (
                      <input
                        type="text"
                        className="p-3 rounded-xl bg-white border border-brand-orange/40 font-bold text-brand-navy text-sm outline-none focus:border-brand-orange focus:ring-4 focus:ring-brand-orange/10 transition-all w-full"
                        value={formData.personalInfo.fullName}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            personalInfo: {
                              ...formData.personalInfo,
                              fullName: e.target.value,
                            },
                          })
                        }
                      />
                    ) : (
                      <div className="p-3 rounded-xl bg-orange-50/50 border border-brand-orange/20 font-bold text-brand-navy text-sm">
                        {formData.personalInfo.fullName}
                      </div>
                    )}
                  </div>

                  {/* Date of Birth */}
                  <div className="flex flex-col gap-1">
                    <label className="font-bold text-[10px] text-brand-orange uppercase tracking-wider ml-1">
                      Date of Birth
                    </label>
                    {isEditing ? (
                      <input
                        type="text"
                        className="p-3 rounded-xl bg-white border border-brand-orange/40 font-bold text-brand-navy text-sm outline-none focus:border-brand-orange focus:ring-4 focus:ring-brand-orange/10 transition-all w-full"
                        value={formData.personalInfo.dateOfBirth}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            personalInfo: {
                              ...formData.personalInfo,
                              dateOfBirth: e.target.value,
                            },
                          })
                        }
                      />
                    ) : (
                      <div className="p-3 rounded-xl bg-orange-50/50 border border-brand-orange/20 font-bold text-brand-navy text-sm">
                        {formData.personalInfo.dateOfBirth}
                      </div>
                    )}
                  </div>

                  {/* Email */}
                  <div className="flex flex-col gap-1">
                    <label className="font-bold text-[10px] text-brand-orange uppercase tracking-wider ml-1">
                      Email Address
                    </label>
                    {isEditing ? (
                      <input
                        type="email"
                        className="p-3 rounded-xl bg-white border border-brand-orange/40 font-bold text-brand-navy text-sm outline-none focus:border-brand-orange focus:ring-4 focus:ring-brand-orange/10 transition-all w-full"
                        value={formData.personalInfo.email}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            personalInfo: {
                              ...formData.personalInfo,
                              email: e.target.value,
                            },
                          })
                        }
                      />
                    ) : (
                      <div className="p-3 rounded-xl bg-orange-50/50 border border-brand-orange/20 font-bold text-brand-navy text-sm">
                        {formData.personalInfo.email}
                      </div>
                    )}
                  </div>

                  {/* Phone */}
                  <div className="flex flex-col gap-1">
                    <label className="font-bold text-[10px] text-brand-orange uppercase tracking-wider ml-1">
                      Phone Number
                    </label>
                    {isEditing ? (
                      <input
                        type="tel"
                        className="p-3 rounded-xl bg-white border border-brand-orange/40 font-bold text-brand-navy text-sm outline-none focus:border-brand-orange focus:ring-4 focus:ring-brand-orange/10 transition-all w-full"
                        value={formData.personalInfo.phone}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            personalInfo: {
                              ...formData.personalInfo,
                              phone: e.target.value,
                            },
                          })
                        }
                      />
                    ) : (
                      <div className="p-3 rounded-xl bg-orange-50/50 border border-brand-orange/20 font-bold text-brand-navy text-sm">
                        {formData.personalInfo.phone}
                      </div>
                    )}
                  </div>

                  {/* Home Address – full width */}
                  <div className="col-span-2 flex flex-col gap-1">
                    <label className="font-bold text-[10px] text-brand-orange uppercase tracking-wider ml-1">
                      Home Address
                    </label>
                    {isEditing ? (
                      <input
                        type="text"
                        className="p-3 rounded-xl bg-white border border-brand-orange/40 font-bold text-brand-navy text-sm outline-none focus:border-brand-orange focus:ring-4 focus:ring-brand-orange/10 transition-all w-full"
                        value={formData.personalInfo.homeAddress}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            personalInfo: {
                              ...formData.personalInfo,
                              homeAddress: e.target.value,
                            },
                          })
                        }
                      />
                    ) : (
                      <div className="p-3 rounded-xl bg-orange-50/50 border border-brand-orange/20 font-bold text-brand-navy text-sm">
                        {formData.personalInfo.homeAddress}
                      </div>
                    )}
                  </div>
                </div>

                {/* Password Reset Section */}
                <div className="mt-8 border-t border-gray-100 pt-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <h4 className="text-[13px] font-black text-brand-navy">
                        Password & Security
                      </h4>
                      <p className="text-[11px] font-bold text-brand-navy/50 mt-0.5">
                        Need to change your password? We will email you a secure
                        link.
                      </p>
                    </div>
                    <button
                      onClick={handleResetPassword}
                      className="px-4 py-2 rounded-xl border border-[#d0d8e8] text-[12px] font-bold text-[#5a6e8c] hover:bg-[#f0f4f9] transition-all whitespace-nowrap self-start sm:self-auto"
                    >
                      Change Password
                    </button>
                  </div>
                </div>
              </section>
            </div>
          </div>

          {/* ── Bottom Row: Full Width Cards ── */}
          <div className="flex flex-col gap-6 w-full">
            {/* Work Details */}
            <section className="bg-white rounded-[2rem] border-2 border-brand-sky shadow-lg p-6 relative overflow-hidden w-full">
              <h3 className="text-2xl font-black text-brand-navy mb-6 flex items-center gap-2">
                <svg className="text-brand-blue w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M20 6h-2.18c.07-.44.18-.88.18-1.36C18 2.98 16.02 1 13.64 1h-3.28C7.98 1 6 2.98 6 4.64c0 .48.11.92.18 1.36H4c-1.1 0-2 .9-2 2v11c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zM8.36 4.64C8.36 4.07 8.93 3.5 10.36 3.5h3.28c1.43 0 2 .57 2 1.14 0 .48-.11.92-.18 1.36H8.54c-.07-.44-.18-.88-.18-1.36zM20 19H4V8h16v11z" />
                </svg>
                Work Details
              </h3>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
                {/* Role */}
                <div className="flex flex-col gap-1">
                  <label className="font-bold text-[10px] text-brand-blue uppercase tracking-wider ml-1">
                    Role
                  </label>
                  <div className="p-3 rounded-xl bg-brand-sky/30 border border-brand-sky/20 font-bold text-brand-navy text-sm">
                    {formData.workDetails.role}
                  </div>
                </div>

                {/* Assigned Room */}
                <div className="flex flex-col gap-1">
                  <label className="font-bold text-[10px] text-brand-blue uppercase tracking-wider ml-1">
                    Assigned Room
                  </label>
                  <div className="p-3 rounded-xl bg-brand-sky/30 border border-brand-sky/20 font-bold text-brand-navy text-sm">
                    {formData.workDetails.assignedRoom}
                  </div>
                </div>

                {/* Employee ID */}
                <div className="flex flex-col gap-1">
                  <label className="font-bold text-[10px] text-brand-blue uppercase tracking-wider ml-1">
                    Employee ID
                  </label>
                  <div className="p-3 rounded-xl bg-brand-sky/30 border border-brand-sky/20 font-bold text-brand-navy text-sm">
                    {formData.workDetails.employeeId}
                  </div>
                </div>

                {/* Schedule Type */}
                <div className="flex flex-col gap-1">
                  <label className="font-bold text-[10px] text-brand-blue uppercase tracking-wider ml-1">
                    Schedule Type
                  </label>
                  <div className="p-3 rounded-xl bg-brand-sky/30 border border-brand-sky/20 font-bold text-brand-navy text-sm">
                    {formData.workDetails.scheduleType}
                  </div>
                </div>
              </div>
            </section>

            {/* Emergency Contacts */}
            <section className="bg-white rounded-[2rem] border-2 border-brand-red shadow-lg p-6 relative overflow-hidden w-full">
              <h3 className="text-2xl font-black text-brand-navy mb-6 flex items-center gap-2">
                <svg className="text-brand-red w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-6 3c.55 0 1 .45 1 1v2h2c.55 0 1 .45 1 1v2c0 .55-.45 1-1 1h-2v2c0 .55-.45 1-1 1h-2c-.55 0-1-.45-1-1v-2H8c-.55 0-1-.45-1-1v-2c0-.55.45-1 1-1h2V7c0-.55.45-1 1-1h2z" />
                </svg>
                Emergency Contacts
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {formData.emergencyContacts.map((contact, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-4 rounded-2xl bg-red-50/50 border border-brand-red/20 hover:bg-red-50 transition-colors"
                  >
                    {/* Left: Icon + Name + Relationship */}
                    <div className="flex items-center gap-4 w-full mr-4">
                      <div className="w-10 h-10 shrink-0 rounded-full bg-brand-red/10 flex items-center justify-center text-brand-red">
                        <svg
                          className="text-brand-red w-5 h-5"
                          fill="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z" />
                        </svg>
                      </div>
                      <div className="w-full flex flex-col gap-1.5">
                        {isEditing ? (
                          <>
                            <input
                              type="text"
                              className="font-bold text-brand-navy text-sm bg-white border border-brand-red/40 rounded-md px-3 py-1.5 outline-none focus:border-brand-red focus:ring-2 focus:ring-brand-red/10 w-full transition-all"
                              value={contact.name}
                              onChange={(e) => {
                                const newContacts = [
                                  ...formData.emergencyContacts,
                                ];
                                newContacts[index].name = e.target.value;
                                setFormData({
                                  ...formData,
                                  emergencyContacts: newContacts,
                                });
                              }}
                            />
                            <input
                              type="text"
                              className="text-[10px] text-brand-red font-black uppercase tracking-wider bg-white border border-brand-red/40 rounded-md px-3 py-1 outline-none focus:border-brand-red focus:ring-2 focus:ring-brand-red/10 w-full transition-all"
                              value={contact.relationship}
                              onChange={(e) => {
                                const newContacts = [
                                  ...formData.emergencyContacts,
                                ];
                                newContacts[index].relationship =
                                  e.target.value;
                                setFormData({
                                  ...formData,
                                  emergencyContacts: newContacts,
                                });
                              }}
                            />
                          </>
                        ) : (
                          <>
                            <div className="font-bold text-brand-navy text-sm">
                              {contact.name}
                            </div>
                            <div className="text-[10px] text-brand-red font-black uppercase tracking-wider mt-0.5">
                              {contact.relationship}
                            </div>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Right: Phone */}
                    <div className="shrink-0 flex items-center">
                      {isEditing ? (
                        <input
                          type="tel"
                          className="font-bold text-brand-navy text-sm bg-white px-4 py-2 rounded-full border border-brand-red/40 outline-none focus:border-brand-red focus:ring-2 focus:ring-brand-red/10 shadow-sm w-[130px] text-center transition-all"
                          value={contact.phone}
                          onChange={(e) => {
                            const newContacts = [
                              ...formData.emergencyContacts,
                            ];
                            newContacts[index].phone = e.target.value;
                            setFormData({
                              ...formData,
                              emergencyContacts: newContacts,
                            });
                          }}
                        />
                      ) : (
                        <div className="font-bold text-brand-navy text-sm bg-white px-3 py-1.5 rounded-lg border border-brand-red/10 shadow-sm">
                          {contact.phone}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </div>
      </TeacherShell>

      {/* Success Modal */}
      <Modal
        isOpen={!!successModal}
        onClose={() => setSuccessModal(null)}
        title="Success"
        footer={
          <button
            onClick={() => setSuccessModal(null)}
            className="px-5 py-2 rounded-lg font-bold text-[13px] text-white bg-green-600 hover:bg-green-700 transition-colors"
          >
            Close
          </button>
        }
      >
        <div className="flex flex-col items-center gap-4 py-2 text-center">
          <div className="w-14 h-14 rounded-full bg-green-50 flex items-center justify-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#16a34a"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="w-7 h-7"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <p className="text-[13px] font-semibold text-[#5a6e8c]">
            {successModal}
          </p>
        </div>
      </Modal>

      {/* Error Modal */}
      <Modal
        isOpen={!!errorModal}
        onClose={() => setErrorModal(null)}
        title="Something went wrong"
        footer={
          <button
            onClick={() => setErrorModal(null)}
            className="px-5 py-2 rounded-lg font-bold text-[13px] text-white bg-[#ba1a1a] hover:bg-[#9b1515] transition-colors"
          >
            Close
          </button>
        }
      >
        <div className="flex flex-col items-center gap-4 py-2 text-center">
          <div className="w-14 h-14 rounded-full bg-[#fff0f0] flex items-center justify-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#ba1a1a"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="w-7 h-7"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>
          <p className="text-[13px] font-semibold text-[#5a6e8c]">
            {errorModal}
          </p>
        </div>
      </Modal>

      {/* Password Change Modal */}
      <Modal
        isOpen={isPasswordModalOpen}
        onClose={() => setIsPasswordModalOpen(false)}
        title="Change Password"
        footer={
          <div className="flex justify-end gap-2 w-full">
            <button
              onClick={() => setIsPasswordModalOpen(false)}
              className="px-5 py-2 rounded-lg font-bold text-[13px] text-brand-navy bg-gray-100 hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleChangePasswordSubmit}
              disabled={isChangingPassword || !passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword}
              className="px-5 py-2 rounded-lg font-bold text-[13px] text-white bg-brand-orange hover:bg-brand-orange/90 transition-colors disabled:opacity-50"
            >
              {isChangingPassword ? "Saving..." : "Save Password"}
            </button>
          </div>
        }
      >
        <div className="flex flex-col gap-4 py-2">
          {passwordError && (
            <div className="p-3 bg-red-50 text-red-600 text-[12px] font-semibold rounded-lg border border-red-100">
              {passwordError}
            </div>
          )}
          
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-bold text-brand-navy uppercase tracking-wider ml-1">
              Current Password
            </label>
            <input
              type="password"
              className="p-3 rounded-xl bg-white border border-gray-200 font-semibold text-brand-navy text-sm outline-none focus:border-brand-orange focus:ring-4 focus:ring-brand-orange/10 transition-all"
              value={passwordForm.currentPassword}
              onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
              placeholder="Enter current password"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-bold text-brand-navy uppercase tracking-wider ml-1">
              New Password
            </label>
            <input
              type="password"
              className="p-3 rounded-xl bg-white border border-gray-200 font-semibold text-brand-navy text-sm outline-none focus:border-brand-orange focus:ring-4 focus:ring-brand-orange/10 transition-all"
              value={passwordForm.newPassword}
              onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
              placeholder="Enter new password (min. 6 characters)"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-bold text-brand-navy uppercase tracking-wider ml-1">
              Confirm New Password
            </label>
            <input
              type="password"
              className="p-3 rounded-xl bg-white border border-gray-200 font-semibold text-brand-navy text-sm outline-none focus:border-brand-orange focus:ring-4 focus:ring-brand-orange/10 transition-all"
              value={passwordForm.confirmPassword}
              onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
              placeholder="Confirm new password"
            />
          </div>
        </div>
      </Modal>
    </>
  );
}