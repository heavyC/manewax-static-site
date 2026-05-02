import Image from "next/image";

export default function Information() {
    return (
        <div className="container mx-auto px-4 py-8 max-w-4xl">
            <h1 className="text-4xl font-bold mb-4 text-slate-800">Sweet Itch: Understanding Insect Bite Sensitivity in Horses</h1>

            {/* Introduction */}
            <section className="mb-2">
                <p className="text-lg text-slate-700 mb-0">
                    "Sweet Itch" is the common term for insect bite sensitivity (IBH) in horses caused by a fly called <em>Culicoides</em>, also known as "no-see-ums" or biting midges in other parts of the world. Horses with sweet itch are allergic to the fly saliva. A single bite can cause their entire body to feel itchy, and the symptoms from one bite can last up to 2 weeks.
                </p>
            </section>

            {/* Symptoms Section */}
            <section className="mb-0">
                <h2 className="text-2xl font-bold mb-2 text-slate-800">Symptoms</h2>
                <div className="float-left mr-6 mb-0">
                    <Image
                        src="/images/sweetitch/sweetitch_7594.jpeg"
                        alt="Horse with sweet itch showing symptoms"
                        width={256}
                        height={144}
                        className="rounded-lg shadow-md"
                    />
                </div>
                <p className="text-slate-700 mb-2">
                    Sweet itch most commonly presents with horses itching their mane, rump, tail, withers, and belly. The constant rubbing and self-trauma result in hair loss, skin thickening, and sores. In severe cases, horses can develop secondary infections from the traumatized skin.
                </p>
            </section>

            {/* Prevention Section */}
            <section className="mb-0">
                <h2 className="text-2xl font-bold mb-2 text-slate-800">Prevention</h2>
                <p className="text-slate-700 mb-2">
                    The best prevention is keeping horses from getting bites. However, this is extremely difficult since <em>Culicoides</em> tend to come out at dawn and dusk and are very difficult to see, hence the name "no-see-ums."
                </p>

                {/* Fly Sheets */}
                <div className="mb-0 pl-6">
                    <h3 className="text-xl font-semibold mb-2 text-slate-800">Fly Sheets</h3>
                    <div className="float-right ml-6 mb-0">
                        <Image
                            src="/images/sweetitch/sweetitch_5838.jpeg"
                            alt="Horse wearing protective fly sheet"
                            width={256}
                            height={144}
                            className="rounded-lg shadow-md"
                        />
                    </div>
                    <p className="text-slate-700 mb-2">
                        Use fly sheets with as much coverage as possible, especially over the belly, tail head, and neck. WeatherBetta ComFiTec Sweet Itch Combo is an example of the type of coverage needed. Adding a fly mask is also recommended.
                    </p>
                </div>

                {/* Stabling */}
                <div className="mb-0 pl-6">
                    <h3 className="text-xl font-semibold mb-2 text-slate-800">Stabling</h3>
                    <p className="text-slate-700 mb-2">
                        Stabled horses rarely have as severe cases of sweet itch. Additional protection can be added by installing screens on stalls or running fans to further reduce fly exposure.
                    </p>
                </div>

                {/* Topical Repellents */}
                <div className="mb-0 pl-6">
                    <h3 className="text-xl font-semibold mb-2 text-slate-800">Topical Repellents</h3>
                    <p className="text-slate-700 mb-2">
                        <strong>Picaridin:</strong> Recently available in the US, this synthetic repellent is less toxic and more effective than DEET. Use it diluted to a 20% concentration.
                    </p>
                </div>

                {/* Herbal Repellents */}
                <div className="mb-0 pl-6">
                    <h3 className="text-xl font-semibold mb-2 text-slate-800">Herbal Repellents</h3>
                    <p className="text-slate-700 mb-2">
                        Studies have shown that Neem and other essential oils, when applied twice daily, significantly decrease symptoms.
                    </p>
                </div>

                {/* Mane Wax */}
                <div className="mb-0 pl-6">
                    <h3 className="text-xl font-semibold mb-2 text-slate-800">Mane Wax</h3>
                    <div className="float-left mr-6 mb-0">
                        <Image
                            src="/images/sweetitch/sweetitch_7595.jpeg"
                            alt="Mane Wax product"
                            width={256}
                            height={144}
                            className="rounded-lg shadow-md"
                        />
                    </div>
                    <p className="text-slate-700 mb-2">
                        Mane Wax combines a topical barrier of beeswax infused with repellent essential oils, such as Neem and lemon eucalyptus. Created to provide a natural product that lasts over 12 hours on the horse's coat.
                    </p>
                </div>
            </section>

            {/* Treatments Section */}
            <section className="mb-0">
                <h2 className="text-2xl font-bold mb-2 text-slate-800">Treatments</h2>
                <div className="float-right ml-6 mb-0">
                    <Image
                        src="/images/sweetitch/sweetitch_8157.jpeg"
                        alt="Horse care and treatment"
                        width={256}
                        height={144}
                        className="rounded-lg shadow-md"
                    />
                </div>
                <p className="text-slate-700 mb-1">
                    Please consult your veterinarian to explore appropriate treatments for your horse.
                </p>

                <div className="space-y-1 mb-0">
                    <div>
                        <h4 className="font-semibold text-slate-800 mb-1">Immunotherapy</h4>
                        <p className="text-slate-700 mb-1">
                            Immunotherapy is becoming increasingly popular for treating sweet itch. Autoserum Granules show approximately 70% improvement rates, while IL-5 vaccines show about 50% improvement in symptoms.
                        </p>
                    </div>

                    <div>
                        <h4 className="font-semibold text-slate-800 mb-1">Antihistamines and Steroids</h4>
                        <p className="text-slate-700 mb-1">
                            Historically, antihistamines or steroids have been the most common treatments, but they usually provide only temporary relief.
                        </p>
                    </div>

                    <div>
                        <h4 className="font-semibold text-slate-800 mb-1">Allergy Shots</h4>
                        <p className="text-slate-700 mb-1">
                            Allergy shots are an option, though studies show they are only about 60% effective.
                        </p>
                    </div>
                </div>
            </section>

            {/* Personal Experience */}
            <section className="mb-2 bg-slate-50 p-6 rounded-lg">
                <h2 className="text-2xl font-bold mb-2 text-slate-800">A Veterinarian's Perspective</h2>
                <p className="text-slate-700 mb-2">
                    As both a horse owner and a veterinarian, I have full empathy for the challenges that sweet itch presents:
                </p>

                <ul className="space-y-1 mb-2 text-slate-700">
                    <li className="flex items-start">
                        <span className="mr-3">•</span>
                        <span><em>"Sweet itch is worst in the summer, and it's too hot to have my horse in a fly sheet."</em></span>
                    </li>
                    <li className="flex items-start">
                        <span className="mr-3">•</span>
                        <span><em>"Keeping my horse in a stall with fans while the others are out is not manageable."</em></span>
                    </li>
                    <li className="flex items-start">
                        <span className="mr-3">•</span>
                        <span><em>"I put repellent on my horse and have tried everything over-the-counter, including herbal products, and they all only last for about one hour."</em></span>
                    </li>
                    <li className="flex items-start">
                        <span className="mr-3">•</span>
                        <span><em>"I do not want to put my horse on steroids and take the risk of laminitis."</em></span>
                    </li>
                </ul>

                <p className="text-slate-700 italic mb-2">
                    And my personal favorite: "I can't believe I have a mustang who was bred and rounded up in the wild, and he is allergic to flies."
                </p>

                <p className="text-slate-700 mb-1">
                    These challenges are what led me to create Mane Wax. I needed something that would stay on and repel bugs effectively but wouldn't be harmful to the skin and coat, or to my family's safety when touching and breathing around it.
                </p>

                <p className="text-slate-700 font-semibold">
                    Thank you for your support.
                </p>
            </section>

            {/* Signature */}
            <section className="text-center py-3">
                <p className="text-base font-semibold text-slate-800 mt-1">Dr. Kari</p>
                <p className="text-slate-600">Veterinarian & ManeWax Creator</p>
            </section>
        </div>
    );
}
