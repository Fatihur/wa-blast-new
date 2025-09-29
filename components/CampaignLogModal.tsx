import React from 'react';
import type { Campaign } from '../types';
import { MessageStatus } from '../types';

interface CampaignLogModalProps {
  campaign: Campaign;
  onClose: () => void;
}

export const CampaignLogModal: React.FC<CampaignLogModalProps> = ({ campaign, onClose }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" aria-modal="true" role="dialog">
      <div className="bg-card rounded-lg shadow-lg p-6 w-full max-w-2xl max-h-[80vh] flex flex-col">
        <div className="flex justify-between items-center border-b pb-3 mb-4">
          <h2 className="text-xl font-semibold">Campaign Logs: {campaign.name}</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground text-2xl font-light leading-none" aria-label="Close modal">&times;</button>
        </div>
        <div className="overflow-y-auto">
          <table className="w-full text-left responsive-table styled-table">
            <thead>
              <tr className="border-b">
                <th className="p-4 font-semibold">Contact</th>
                <th className="p-4 font-semibold">Status</th>
                <th className="p-4 font-semibold">Details / Error</th>
              </tr>
            </thead>
            <tbody>
              {campaign.logs.map((log, index) => (
                <tr key={index} className="border-b last:border-b-0">
                  <td data-label="Contact" className="p-4">
                    <div>{log.contact.name}</div>
                    <div className="text-xs">{log.contact.number}</div>
                  </td>
                  <td data-label="Status" className="p-4">
                     <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                          log.status === MessageStatus.Sent ? 'bg-green-100 text-green-800' :
                          log.status === MessageStatus.Delivered ? 'bg-sky-100 text-sky-800' :
                          log.status === MessageStatus.Read ? 'bg-purple-100 text-purple-800' :
                          log.status === MessageStatus.Failed ? 'bg-red-100 text-red-800' :
                          log.status === MessageStatus.Sending ? 'bg-blue-100 text-blue-800' :
                          'bg-gray-100 text-gray-800'
                      }`}>
                          {log.status}
                      </span>
                  </td>
                  <td data-label="Details" className="p-4 text-sm break-all">
                    {log.status === MessageStatus.Failed ? (
                      <span className="text-red-600">{log.error || 'Unknown error'}</span>
                    ) : (
                      '-'
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
         <div className="mt-4 pt-4 border-t flex justify-end">
            <button onClick={onClose} className="bg-secondary px-4 py-2 rounded-md font-semibold hover:bg-accent">Close</button>
        </div>
      </div>
    </div>
  );
};