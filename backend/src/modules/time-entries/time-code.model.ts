import { Document, Schema, Types, model } from 'mongoose';

export interface ITimeCode extends Document {
    code: string;
    description?: string;
    isBillable?: boolean;
    /** Legacy planner sheet field */
    type?: string;
    project_id?: Types.ObjectId;
    status?: string;
}

const TimeCodeSchema = new Schema<ITimeCode>(
    {
        code: { type: String, required: true, unique: true, index: true },
        description: { type: String },
        isBillable: { type: Boolean, default: false },
        type: { type: String },
        project_id: { type: Schema.Types.ObjectId, ref: 'Project' },
        status: { type: String },
    },
    { timestamps: true, collection: 'time_codes' }
);

export const TimeCode = model<ITimeCode>('TimeCode', TimeCodeSchema);
