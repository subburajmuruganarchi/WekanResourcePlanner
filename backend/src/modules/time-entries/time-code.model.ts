import { Document, Schema, model } from 'mongoose';

export interface ITimeCode extends Document {
    code: string;
    description: string;
    isBillable: boolean;
}

const TimeCodeSchema = new Schema<ITimeCode>({
    code: { type: String, required: true, unique: true, index: true },
    description: { type: String, required: true },
    isBillable: { type: Boolean, default: false }
}, { timestamps: true });

export const TimeCode = model<ITimeCode>('TimeCode', TimeCodeSchema);
