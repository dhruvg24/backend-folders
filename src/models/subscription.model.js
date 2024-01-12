import mongoose, {Schema} from "mongoose"


const subscriptionSchema = new Schema({
    // need subscriber
    subscriber : {
        type:Schema.Types.ObjectId,
        ref: "User"
    },
    channel: {
        // owner of channel is also a user in itself
        type: Schema.Types.ObjectId, 
        ref: "User"
    }
}, {timestamps: true})


export const Subscription = mongoose.model("Subscription", subscriptionSchema)