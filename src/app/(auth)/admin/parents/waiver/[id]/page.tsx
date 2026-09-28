"use client";

import { use, useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/app-shell";

export default function SignWaiverPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [parent, setParent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/accounts/${id}`);
        if (res.ok) {
          const data = await res.json();
          setParent(data);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    
    // Setup for high-res drawing
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * 2;
    canvas.height = rect.height * 2;
    ctx.scale(2, 2);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#0f172a";
    ctx.lineWidth = 3;
  }, [loading]);

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    setIsDrawing(true);
    setHasSignature(true);
    
    const rect = canvas.getBoundingClientRect();
    const x = ('touches' in e) ? e.touches[0].clientX - rect.left : (e as React.MouseEvent).clientX - rect.left;
    const y = ('touches' in e) ? e.touches[0].clientY - rect.top : (e as React.MouseEvent).clientY - rect.top;
    
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = ('touches' in e) ? e.touches[0].clientX - rect.left : (e as React.MouseEvent).clientX - rect.left;
    const y = ('touches' in e) ? e.touches[0].clientY - rect.top : (e as React.MouseEvent).clientY - rect.top;

    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
  };

  const handleSign = async () => {
    if (!hasSignature) return alert("Please sign the document before submitting.");
    const canvas = canvasRef.current;
    if (!canvas) return;

    const signatureDataUrl = canvas.toDataURL("image/png");

    setSubmitting(true);
    try {
      const res = await fetch(`/api/accounts/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...parent,
          waiverSigned: true,
          waiverSignedAt: new Date().toISOString(),
          waiverSignature: signatureDataUrl, // We can store base64 if it's small, or upload to storage. We'll store it directly for simplicity.
        }),
      });

      if (!res.ok) throw new Error("Failed to save waiver.");
      
      // Update cache
      fetch("/api/accounts").catch(() => {});
      
      alert("Waiver signed successfully!");
      router.push("/admin/parents");
    } catch (e) {
      console.error(e);
      alert("Error saving waiver.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <AppShell title="Waiver Signature"><div className="p-8">Loading...</div></AppShell>;
  if (!parent) return <AppShell title="Waiver Signature"><div className="p-8">Parent not found.</div></AppShell>;

  return (
    <AppShell title="Waiver Signature">
      <div className="max-w-4xl mx-auto py-10 px-4">
        
        <button onClick={() => router.back()} className="text-[#0050d5] font-bold text-sm mb-6 flex items-center gap-2 hover:underline">
          ← Back to Parents
        </button>

        <div className="bg-white rounded-3xl p-8 md:p-12 shadow-[0_8px_32px_rgba(0,0,0,0.06)] border border-[#e2e8f0]">
          
          <div className="text-center mb-10">
            <h1 className="text-2xl md:text-3xl font-extrabold text-[#002f76] mb-2 uppercase tracking-wide">MERRY EXPLORERS PLAYGROUP LEARNING CENTER</h1>
            <h2 className="text-xl md:text-2xl font-bold text-[#475569] mb-4">PARENT/GUARDIAN ACKNOWLEDGMENT & AGREEMENT</h2>
            <p className="text-[#64748b] leading-relaxed max-w-2xl mx-auto">
              By registering my child with Merry Explorers Playgroup Learning Center, I confirm that I have
              read, understood, and agree to the following program terms and policies:
            </p>
          </div>

          <div className="prose prose-sm md:prose-base max-w-none text-[#334155] leading-loose">
            <h3 className="text-[#0050d5] font-bold uppercase tracking-wide">1. ADVENTURE / CYCLE</h3>
            <p>
              For Merry Explorers, “Adventure” means “Cycle.” Adventure 1, Adventure 2, Adventure 3,
              and so on refer to the succeeding stages of the program. An Adventure is not tied to a
              calendar month. A child progresses to the next Adventure once the required sessions for their
              program have been completed, including applicable make-up sessions. Adventure dates may
              therefore differ between programs.
            </p>

            <h3 className="text-[#0050d5] font-bold uppercase tracking-wide mt-8">2. PROGRAMS</h3>
            <p className="font-bold">Discovery Club — Discover Through Play</p>
            <ul className="list-none pl-0 space-y-2">
              <li>🔎 <strong>Discovery Club: Curious Explorer:</strong> Ages 1.5–4.11 | ₱4,295 (Pioneer Family); ₱4,395 (New Family) | 8 sessions | 1 hr/session</li>
              <li>🎨 <strong>Discovery Club: Creative Explorer:</strong> Ages 2.6–4.11 | ₱4,820 (Pioneer Family); ₱4,985 (New Family) | 12 sessions | 1 hr 15 mins/session</li>
              <li>🌈 <strong>Discovery Club: Everyday Curious:</strong> Ages 1.5–4.11 | ₱7,518 | 15 sessions | 1 hr/session</li>
            </ul>
            <p className="mt-4">
              Discovery Club provides a play-based environment that encourages socialization, interaction,
              shared play, and confidence-building. It may also be a suitable starting point for children who
              are not yet using verbal communication.
            </p>

            <p className="font-bold mt-6">💡 Trailblazer: Brave Explorer — Prepare for What’s Next</p>
            <ul className="list-disc pl-5">
              <li>Ages 3–4.11 | ₱6,900 | 18 sessions | 1 hr 15 mins/face-to-face session/shift to online</li>
            </ul>
            <p><strong>Milestone Checkpoint:</strong> The 18th session includes the Exploration Diary presentation, review of the child's learning and discoveries, and milestone recognition through a Certificate of Recognition/Completion.</p>
            <p className="font-bold">Little Trailblazer Prerequisites:</p>
            <p>The child should be able to comfortably grip age-appropriate materials, participate independently with teachers, and sit still independently for at least 3 minutes.</p>

            <h3 className="text-[#0050d5] font-bold uppercase tracking-wide mt-8">3. REGISTRATION & PAYMENT</h3>
            <ul className="list-disc pl-5 space-y-1">
              <li>60% reservation payment is required upon registration to secure the child's slot.</li>
              <li>The 60% reservation payment is non-refundable once the slot is confirmed.</li>
              <li>The remaining 40% balance is due on the 6th session.</li>
              <li>A 4% interest charge will apply to overdue outstanding balances. Interest is applied on a weekly basis, with the applicable interest charge taking effect every Monday.</li>
              <li>We will only accept Bank Transfer and GCash payments.</li>
              <li>Statement of Account regenerates every Monday.</li>
            </ul>

            <h3 className="text-[#0050d5] font-bold uppercase tracking-wide mt-8">4. ATTENDANCE & MAKE-UP SESSIONS</h3>
            <p><strong>🔎 Discovery Club: Curious Explorer</strong> - If a class is suspended due to weather, the session will be moved to the next Monday or Wednesday until all required Adventure sessions are completed.</p>
            <p><strong>🎨 Discovery Club: Creative Explorer</strong> - Classes will continue according to the regular schedule, and any weather-related suspended session will automatically be made up on a Saturday. Families won’t need to figure out when to insert the missed session—the Saturday make-up arrangement will continue until the required number of Adventure sessions is completed.</p>
            <p><strong>💡 Trailblazer: Brave Explorer</strong> - Because Trailblazer follows a progressive and consistent routine, a suspended face-to-face session will shift online.</p>
            <ul className="list-disc pl-5">
              <li>Online session: 45 minutes</li>
              <li>Practice worksheets will be provided</li>
              <li>The online shift is considered a consumed session</li>
            </ul>
            <p><strong>🌈 Discovery Club: Everyday Curious</strong> - If a class is suspended, the missed session will be moved to the next learning day. Classes will continue from Monday to Friday until all 15 required Adventure sessions are completed. The number of sessions remains the same; only the schedule is adjusted.</p>
            <p><strong>💛 Complimentary Free Session for All Explorers</strong> - For an excused missed session, such as sickness or other valid reasons, each child receives 1 complimentary session per Adventure. This is only one free session regardless of the number of missed sessions and the schedule will be determined by Merry Explorers.</p>

            <h3 className="text-[#0050d5] font-bold uppercase tracking-wide mt-8">5. PHOTO & VIDEO HIGHLIGHTS</h3>
            <p className="font-bold">📸 Photo Highlights:</p>
            <ul className="list-disc pl-5">
              <li><strong>Photo Sending Schedule:</strong>
                <ul className="list-circle pl-5 mt-1">
                  <li>🔎 Discovery Club: Curious Explorer - Monday</li>
                  <li>🎨 Discovery Club: Creative Explorer - Tuesday & Thursday</li>
                  <li>💡 Trailblazer: Brave Explorer - Thursday & Friday</li>
                  <li>🌈 Discovery Club: Everyday Curious - Thursday & Friday</li>
                </ul>
              </li>
            </ul>
            <p className="font-bold mt-4">🎥 Video Highlights:</p>
            <ul className="list-disc pl-5">
              <li><strong>Video Uploading Schedule:</strong>
                <ul className="list-circle pl-5 mt-1">
                  <li>🔎 Discovery Club: Curious Explorer - Wednesday</li>
                  <li>🎨 Discovery Club: Creative Explorer - Friday</li>
                  <li>💡 Trailblazer: Brave Explorer - Monday</li>
                  <li>🌈 Discovery Club: Everyday Curious - Monday</li>
                </ul>
              </li>
              <li>Video Highlights will be posted on the official Merry Explorers page.</li>
            </ul>
            <p><strong>🗑️ Photo Deletion:</strong> All photos in the Google Drive will be deleted every Saturday at 11:59 PM, regardless of whether they have been downloaded. Parents/Guardians are responsible for downloading photos they wish to keep before the deadline.</p>

            <h3 className="text-[#0050d5] font-bold uppercase tracking-wide mt-8">6. MERRY EXPLORERS UNIFORM</h3>
            <p>We would also like to clarify an important part of our uniform policy:</p>
            <p className="font-bold text-[#002f76]">The Merry Explorers uniform is the SAME uniform.</p>
            <p>If your child already has a Merry Explorers uniform from the previous chapter, you are NOT required to purchase a new set for Adventure 1. We want families to be able to continue using the uniform they already have.</p>
            <p><strong>Uniform Days:</strong> Wednesday & Friday</p>
            <p>On all other class days, children may wear anything comfortable, safe, and appropriate for active play and learning.</p>
            <p className="font-bold mt-4">Welcome Kit — ₱750</p>
            <p>For families who need a new set or an additional set, the Uniform Kit is available for ₱750 and includes:</p>
            <ul className="list-disc pl-5">
              <li>1 Merry Explorers polo shirt with logo</li>
              <li>1 pair of jogging pants</li>
              <li>1 name tag with Merry Explorers lanyard</li>
            </ul>
            <p className="font-bold mt-4">Lanyard & Name Tag — ₱200</p>
            <ul className="list-disc pl-5">
              <li>A Merry Explorers lanyard with laminated name tag may also be purchased separately for ₱200.</li>
            </ul>
            <p>If you just need the uniform, you may still purchase the polo and jogging pants with the Merry Explorers logo priced at ₱550/set.</p>

            <hr className="my-10 border-[#cbd5e1]" />

            <h3 className="text-[#002f76] font-extrabold uppercase tracking-widest text-lg mb-4">PARENT/GUARDIAN ACKNOWLEDGMENT</h3>
            <p>
              I, the undersigned Parent/Guardian, confirm that I have read, understood, and voluntarily
              agree to all terms and policies stated in this Agreement, including those covering program
              requirements, payments, attendance and make-ups, photos and videos, and uniforms.
            </p>
            <p>
              I confirm that the information I provided about my child is true and complete, and I agree to
              comply with Merry Explorers' policies and arrangements.
            </p>
            <p className="mb-8">
              By signing below, I voluntarily acknowledge, accept, and agree to be bound by these terms
              and policies as part of my child's registration with Merry Explorers Playgroup Learning Center.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
              <div>
                <div className="text-xs font-bold text-[#64748b] uppercase tracking-wider mb-1">Child's Name</div>
                <div className="text-lg font-bold border-b border-[#cbd5e1] pb-2">{parent.childName}</div>
              </div>
              <div>
                <div className="text-xs font-bold text-[#64748b] uppercase tracking-wider mb-1">Program / Adventure</div>
                <div className="text-lg font-bold border-b border-[#cbd5e1] pb-2">{parent.program}</div>
              </div>
              <div>
                <div className="text-xs font-bold text-[#64748b] uppercase tracking-wider mb-1">Parent/Guardian Name</div>
                <div className="text-lg font-bold border-b border-[#cbd5e1] pb-2">{parent.fullName}</div>
              </div>
              <div>
                <div className="text-xs font-bold text-[#64748b] uppercase tracking-wider mb-1">Date</div>
                <div className="text-lg font-bold border-b border-[#cbd5e1] pb-2">{new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</div>
              </div>
            </div>

            <div className="mt-8">
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-bold text-[#1e293b]">Digital Signature</label>
                <button onClick={clearSignature} className="text-xs text-[#0050d5] font-bold hover:underline">Clear Signature</button>
              </div>
              <div className="border-2 border-dashed border-[#94a3b8] rounded-2xl overflow-hidden bg-[#f8fafc]">
                <canvas
                  ref={canvasRef}
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseOut={stopDrawing}
                  onTouchStart={startDrawing}
                  onTouchMove={draw}
                  onTouchEnd={stopDrawing}
                  className="w-full h-[200px] cursor-crosshair touch-none"
                />
              </div>
              {!hasSignature && <p className="text-sm text-red-500 font-bold mt-2">Please sign in the box above to continue.</p>}
            </div>

            <div className="mt-10 flex justify-end">
              <button
                onClick={handleSign}
                disabled={submitting || !hasSignature}
                className="bg-[#10b981] text-white px-10 py-4 rounded-full font-bold shadow-lg shadow-[#10b981]/30 hover:-translate-y-1 transition-transform disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none text-lg"
              >
                {submitting ? "Saving..." : "I Agree & Sign"}
              </button>
            </div>
            
          </div>
        </div>
      </div>
    </AppShell>
  );
}
