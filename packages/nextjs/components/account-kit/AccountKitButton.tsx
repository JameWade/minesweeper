"use client";
import { useAuthModal, useLogout, useSignerStatus, useUser } from "@account-kit/react";
import { useSmartAccountClient } from "@account-kit/react";

export const AccountKitButton = () => {
  const user = useUser();
  const { openAuthModal } = useAuthModal();
  const signerStatus = useSignerStatus();
  const { logout } = useLogout();
  const { client, address, isLoadingClient } = useSmartAccountClient({});

  if (signerStatus.isInitializing) {
    return <button className="btn btn-primary btn-sm">Loading...</button>;
  }

  if (user) {
    
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm">{user.email ?? address?.slice(0, 6)}</span>
        <button className="btn btn-primary btn-sm" onClick={() => logout()}>
          Logout
        </button>
      </div>
    );
  }

  return (
    <button className="btn btn-primary btn-sm" onClick={openAuthModal}>
      Login
    </button>
  );
}; 