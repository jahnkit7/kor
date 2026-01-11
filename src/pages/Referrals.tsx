import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { ReferralSection } from "@/components/settings/ReferralSection";

const Referrals = () => {
  const navigate = useNavigate();

  return (
    <>
      {/* Header */}
      <div className="bg-card px-4 pb-6 border-b border-border" style={{ paddingTop: 'max(env(safe-area-inset-top), 16px)' }}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/settings")}
            >
              <ArrowLeft className="w-6 h-6" />
            </Button>
            <h1 className="text-xl font-bold text-[#051425]">Parrainage</h1>
          </div>
          <NotificationBell />
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        <ReferralSection />
      </div>
    </>
  );
};

export default Referrals;
