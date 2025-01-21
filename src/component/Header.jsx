import React, {useEffect, useState} from "react";

export default function Header() {
    return (
        <header className="bg-slate-400 h-11 mb-2 fixed shadow-lg w-full z-50">
        <h1 className="text-center text-3xl font-bold p-1 text-slate-900">Email Builder</h1>
        </header>
    )
}