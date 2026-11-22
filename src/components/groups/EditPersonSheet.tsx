'use client';

import { useState } from 'react';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { createClient } from '@/lib/supabase/client';

export type EditablePerson = {
  id: string;
  /** Joined: their nickname in this trip ('' = none). Not joined: their name. */
  name: string;
  /** Joined people's own name, shown as the placeholder for a nickname */
  ownName?: string;
  weight: number;
  joined: boolean;
};

/** Admin-only: rename someone (or give a joined person a nickname) and set who they pay for. */
/** Render with key={person.id} so the form starts from that person each time. */
export default function EditPersonSheet({ groupId, person, onClose, onSaved }: {
  groupId: string; person: EditablePerson; onClose: () => void; onSaved: () => void;
}) {
  const { toast } = useToast();
  const [name, setName] = useState(person.name);
  const [weight, setWeight] = useState(person.weight);
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    const { error } = await createClient().rpc('update_person', { p_group_id: groupId, p_person_id: person.id, p_name: name, p_weight: weight });
    setSaving(false);
    if (error) { toast(/update_person/.test(error.message) ? 'This needs a quick database update first' : error.message, 'error'); return; }
    toast('Saved');
    onSaved();
    onClose();
  }

  return (
    <Modal open onClose={onClose} title={`Edit ${person.joined ? person.ownName : person.name}`}>
      <div className="p-4 space-y-5">
        <label className="block">
          <span className="text-sm font-medium text-gray-900">{person.joined ? 'Nickname in this trip' : 'Name'}</span>
          <input
            value={name}
            maxLength={60}
            placeholder={person.ownName}
            onChange={(e) => setName(e.target.value)}
            className="mt-1.5 w-full h-11 rounded-xl border border-gray-200 bg-white px-3 text-gray-900"
          />
          {person.joined && <span className="block mt-1 text-xs text-gray-500">Only changes how this trip shows them. Leave empty to use their own name.</span>}
        </label>

        <div>
          <p className="text-sm font-medium text-gray-900">Pays for</p>
          <div className="mt-1.5 grid grid-cols-4 gap-1 rounded-xl bg-gray-100 p-1">
            {[1, 2, 3, 4].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setWeight(n)}
                className={`h-9 rounded-lg text-sm font-medium ${weight === n ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}
              >
                {n === 1 ? 'Just self' : n}
              </button>
            ))}
          </div>
          <p className="mt-1 text-xs text-gray-500">
            Only for a couple or family who pay as one and are added as one person. Equal splits count them {weight > 1 ? `as ${weight}` : 'once'}.
          </p>
        </div>

        <Button onClick={save} loading={saving} fullWidth>Save</Button>
      </div>
    </Modal>
  );
}
