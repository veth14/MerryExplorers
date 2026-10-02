import Link from "next/link";

export default function UnauthorizedPage() {
  return (
    <div className="min-h-screen bg-[#f0f4f9] flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl overflow-hidden border border-[#e2e8f0]">
        <div className="p-8 flex flex-col items-center text-center">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mb-6">
            <span className="text-4xl">🛑</span>
          </div>
          
          <h1 className="text-2xl font-black text-[#002f76] mb-3 font-headline">
            Access Denied
          </h1>
          
          <p className="text-[14.5px] font-medium text-[#475569] leading-relaxed mb-8">
            You are trying to access an admin or restricted page. 
            You do not have the necessary permissions to view this content.
          </p>
          
          <Link 
            href="/"
            className="w-full bg-[#0033A0] hover:bg-[#002580] text-white font-bold py-3.5 px-6 rounded-xl transition-colors shadow-md shadow-[#0033A0]/20"
          >
            Go Back Home
          </Link>
        </div>
        
        <div className="bg-[#f8fafc] px-8 py-4 border-t border-[#e2e8f0]">
          <p className="text-[12px] font-semibold text-[#64748b] text-center">
            If you believe this is an error, please contact the administrator.
          </p>
        </div>
      </div>
    </div>
  );
}
