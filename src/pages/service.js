import Deployments from "./Deployments";
import AddService from "../components/AddService";
import { useState, useRef } from "react";

const Service = () => {

    const [open, setOpen] = useState(false);
    const deploymentsRef = useRef(null);

      return (
    <section className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">서비스 배포 상태</h3>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 flex items-center gap-2"
        >
          서비스 추가
        </button>
      </div>

      <div className="p-6 space-y-4">
        <Deployments ref={deploymentsRef} />
      </div>

      {/* 모달 */}
      <AddService
        open={open}
        onClose={() => setOpen(false)}
        onCreated={() => {
          setOpen(false);
          deploymentsRef.current?.refetch();
        }}
      />
    </section>
  );
};

export default Service;
